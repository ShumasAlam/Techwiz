const Report = require('../models/Report');
const Order = require('../models/Order');
const Farmer = require('../models/Farmer');
const User = require('../models/User');
const Market = require('../models/Market');
const Product = require('../models/Product');

const buildReportData = async (type) => {
  const [orders, farmers, users, markets, products] = await Promise.all([
    Order.find({}).lean(),
    Farmer.find({}).lean(),
    User.find({}).lean(),
    Market.find({}).lean(),
    Product.find({}).lean()
  ]);

  if (type === 'Market activity report') {
    const headers = ['Market Name', 'Day', 'Stalls', 'Total Orders', 'Revenue (Rs.)'];
    const rows = markets.map(m => {
      const marketOrders = orders.filter(o => o.marketId === m.id || o.marketId === m._id?.toString());
      const rev = marketOrders.reduce((sum, o) => sum + (o.total || o.totalAmount || 0), 0);
      return [m.name, m.day, m.stalls || 0, marketOrders.length, rev];
    });
    return { headers, rows, count: rows.length };
  }

  if (type === 'Farmer revenue summary') {
    const headers = ['Farmer Name', 'Owner', 'Status', 'Rating', 'Completed Orders', 'Total Sales (Rs.)'];
    const rows = farmers.map(f => {
      const fOrders = orders.filter(o => o.farmerId === f.id && ['completed', 'ready', 'accepted'].includes(o.status || o.orderStatus));
      const total = fOrders.reduce((sum, o) => sum + (o.total || o.totalAmount || 0), 0);
      return [f.name, f.owner, f.status, f.rating, fOrders.length, total];
    });
    return { headers, rows, count: rows.length };
  }

  if (type === 'Customer growth report') {
    const customers = users.filter(u => u.role === 'customer');
    const headers = ['Customer Name', 'Email', 'Status', 'Favorites Count', 'Total Reservations'];
    const rows = customers.map(c => {
      const custOrders = orders.filter(o => o.customerId === c.id || o.customerId === c._id?.toString());
      return [c.name || c.username, c.email, c.status || 'active', (c.favorites || []).length, custOrders.length];
    });
    return { headers, rows, count: rows.length };
  }

  // Inventory availability report
  const headers = ['Product Name', 'Category', 'Price (Rs.)', 'Stock Available', 'Unit', 'Status'];
  const rows = products.map(p => [
    p.name,
    p.category,
    p.price,
    p.stock !== undefined ? p.stock : (p.stockQuantity || 0),
    p.unit || 'kg',
    (p.stock > 0 && p.available !== false) ? 'In Stock' : 'Sold Out'
  ]);
  return { headers, rows, count: rows.length };
};

const toCSV = ({ headers, rows }) => {
  const sanitize = (val) => {
    const str = String(val ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };
  const headerLine = headers.map(sanitize).join(',');
  const dataLines = rows.map(r => r.map(sanitize).join(','));
  return [headerLine, ...dataLines].join('\n');
};

const getReports = async (req, res) => {
  try {
    const reports = await Report.find({}).sort({ createdAt: -1 }).limit(20).lean();
    res.json(reports);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ message: 'Server error retrieving reports' });
  }
};

const generateReport = async (req, res) => {
  try {
    const { reportType } = req.body;
    const validTypes = [
      'Market activity report',
      'Farmer revenue summary',
      'Customer growth report',
      'Inventory availability report'
    ];

    const type = validTypes.includes(reportType) ? reportType : validTypes[0];
    const reportData = await buildReportData(type);
    const csvData = toCSV(reportData);

    const id = 'rep-' + Date.now().toString(36);
    const report = new Report({
      id,
      reportType: type,
      generatedBy: req.user?.name || req.user?.username || 'admin',
      metrics: { totalRows: reportData.count, generatedAt: new Date().toISOString() },
      csvData
    });

    await report.save();
    res.status(201).json({
      id: report.id,
      reportType: report.reportType,
      generatedBy: report.generatedBy,
      createdAt: report.createdAt,
      csvData,
      metrics: report.metrics
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ message: error.message || 'Server error generating report' });
  }
};

const exportReportCSV = async (req, res) => {
  try {
    const { type } = req.params;
    const decodedType = decodeURIComponent(type);
    const reportData = await buildReportData(decodedType);
    const csvContent = toCSV(reportData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${decodedType.replace(/\s+/g, '_')}_${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ message: 'Server error exporting report CSV' });
  }
};

module.exports = {
  getReports,
  generateReport,
  exportReportCSV
};
