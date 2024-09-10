const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const port = 3000;

// Import the products and orders modules
const { router: productsRouter } = require('./products');
const ordersRouter = require('./orders');

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Use the routers
app.use('/products', productsRouter);
app.use('/orders', ordersRouter);

// Serve the order form
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'order_form.html'));
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
