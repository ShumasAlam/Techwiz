const Product = require('../models/Product');
const Market = require('../models/Market');
const Farmer = require('../models/Farmer');

const handleChat = async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    const text = message.toLowerCase().trim();

    // Fetch live context from database
    const [products, markets, farmers] = await Promise.all([
      Product.find({ available: true, stock: { $gt: 0 } }).lean(),
      Market.find({}).lean(),
      Farmer.find({ status: 'approved' }).lean()
    ]);

    let reply = '';
    let suggestions = [];
    let matchedProducts = [];
    let matchedMarkets = [];
    let matchedFarmers = [];

    // 1. Timings / Schedule Query
    if (text.includes('timing') || text.includes('hour') || text.includes('when') || text.includes('time') || text.includes('open')) {
      const schedules = markets.map(m => `📍 **${m.name}**: ${m.day}, ${m.hours || m.openingTime + ' — ' + m.closingTime} (${m.address})`).join('\n');
      reply = `Here are the market timings for our active pickup points:\n\n${schedules}\n\nYou can reserve fresh harvest ahead of time and collect during these hours without waiting!`;
      suggestions = ['Show available vegetables', 'Which market is closest?', 'How do I place an order?'];
    }

    // 2. Pricing / Cost Query
    else if (text.includes('price') || text.includes('cost') || text.includes('rate') || text.includes('how much')) {
      const topPriced = products.slice(0, 5).map(p => `• **${p.name}**: Rs. ${p.price} / ${p.unit || 'kg'} (${p.stock} in stock)`).join('\n');
      reply = `All prices are set directly by our local growers with zero middleman markup:\n\n${topPriced}\n\nSearch any product name to see live rates and farm details.`;
      suggestions = ['Organic tomatoes price', 'View seasonal fruit', 'Market timings'];
    }

    // 3. Markets / Locations Query
    else if (text.includes('market') || text.includes('location') || text.includes('where') || text.includes('near') || text.includes('address')) {
      matchedMarkets = markets.slice(0, 4);
      const list = matchedMarkets.map(m => `🏪 **${m.name}**\n   • Day: ${m.day}\n   • Hours: ${m.hours || '8:00 AM — 2:00 PM'}\n   • Address: ${m.address}`).join('\n\n');
      reply = `We have ${markets.length} active farmers markets in the network:\n\n${list}\n\nUse our Map & Route feature on the homepage to find directions to the nearest stall!`;
      suggestions = ['Show products at nearest market', 'Farmer profiles', 'Place reservation'];
    }

    // 4. Farmer / Grower Query
    else if (text.includes('farmer') || text.includes('grower') || text.includes('farm') || text.includes('who grows')) {
      matchedFarmers = farmers.slice(0, 4);
      const list = matchedFarmers.map(f => `🧑‍🌾 **${f.name}** (Owner: ${f.owner})\n   • Specialties: ${f.specialties?.join(', ') || 'Fresh produce'}\n   • Rating: ⭐ ${f.rating || 5}/5`).join('\n\n');
      reply = `Here are some of our trusted local farmers:\n\n${list}\n\nEach farmer harvests fresh weekly and confirms pre-orders directly.`;
      suggestions = ['View farmer products', 'Show organic items', 'Market schedule'];
    }

    // 5. Product Search (Vegetables, Fruits, Tomatoes, etc.)
    else {
      // Find matching products
      const matching = products.filter(p => 
        text.includes(p.name.toLowerCase()) || 
        text.includes(p.category.toLowerCase()) ||
        (p.subcategory && text.includes(p.subcategory.toLowerCase()))
      );

      if (matching.length > 0) {
        matchedProducts = matching.slice(0, 4);
        const list = matching.slice(0, 4).map(p => `🥦 **${p.name}** — Rs. ${p.price}/${p.unit || 'kg'}\n   • Category: ${p.category} | Stock: ${p.stock} available\n   • Badge: ${p.badge || 'Fresh Harvest'}`).join('\n\n');
        reply = `I found **${matching.length}** item(s) matching your inquiry:\n\n${list}\n\nAdd them to your basket to reserve before weekly stock runs out!`;
        suggestions = ['How does pickup work?', 'Show all categories', 'Check market timings'];
      } else {
        reply = `I'm your **MarketLink AI Assistant**! 🌿\n\nI can help you with:\n• Finding fresh harvest (Vegetables, Fruits, Dairy, Bakery)\n• Checking market schedules and pickup slots\n• Discovering verified local farmers\n• Guiding you through the zero-fee reservation process\n\nWhat would you like to explore today?`;
        suggestions = ['Show today\'s harvest', 'Market timings', 'Top rated farmers', 'How does reservation work?'];
      }
    }

    res.json({
      reply,
      suggestions,
      matchedProducts: matchedProducts.map(p => ({ id: p.id, name: p.name, price: p.price, unit: p.unit })),
      matchedMarkets: matchedMarkets.map(m => ({ id: m.id, name: m.name, day: m.day })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ message: 'Server error processing AI assistant query' });
  }
};

const getSuggestions = (req, res) => {
  res.json([
    'What markets are open this Saturday?',
    'Show me fresh organic vegetables',
    'How do I reserve and pay for my basket?',
    'Which farmers have 5-star ratings?',
    'What is in season this week?'
  ]);
};

module.exports = {
  handleChat,
  getSuggestions
};
