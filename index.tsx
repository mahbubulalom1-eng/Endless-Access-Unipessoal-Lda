/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from "@google/genai";

// --- Type Definitions ---
interface User {
    username: string;
    role: 'admin' | 'employee';
}

interface StoredUser {
    [username: string]: {
        password?: string;
        role: 'admin' | 'employee';
    }
}

interface Product {
    id: string;
    name: string;
    category: string;
    price: number;
    stock: number;
    image: string;
}

interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
}

interface Sale {
    id: string;
    customerId: string;
    customerName: string;
    productId: string;
    productName: string;
    quantity: number;
    totalPrice: number;
    date: string;
}


// Tell TypeScript about the Bootstrap and Chart.js global variables
declare var Chart: any;
declare var bootstrap: any;

document.addEventListener('DOMContentLoaded', function() {
    // --- State Variables ---
    let currentUser: User | null = null;
    let productModal: any | null = null;
    let customerModal: any | null = null;
    let saleModal: any | null = null;
    let salesChartInstance: any | null = null;
    let salesSummaryChartInstance: any | null = null;
    let categorySalesChartInstance: any | null = null;


    // --- DOM Element Selectors ---
    const loginPage = document.getElementById('loginPage') as HTMLElement;
    const appPage = document.getElementById('appPage') as HTMLElement;
    const registrationForm = document.getElementById('registrationForm') as HTMLElement;
    const loginForm = document.getElementById('loginForm') as HTMLElement;
    const productSearchInput = document.getElementById('productSearchInput') as HTMLInputElement;

    // Buttons
    const showRegisterLink = document.getElementById('showRegisterLink') as HTMLAnchorElement;
    const showLoginLink = document.getElementById('showLoginLink') as HTMLAnchorElement;
    const signupBtn = document.getElementById('signupBtn') as HTMLButtonElement;
    const loginBtn = document.getElementById('loginBtn') as HTMLButtonElement;
    const logoutBtn = document.getElementById('logoutBtn') as HTMLAnchorElement;
    const saveProductBtn = document.getElementById('saveProductBtn') as HTMLButtonElement;
    const addNewProductBtn = document.getElementById('addNewProductBtn') as HTMLButtonElement;
    const saveCustomerBtn = document.getElementById('saveCustomerBtn') as HTMLButtonElement;
    const addNewCustomerBtn = document.getElementById('addNewCustomerBtn') as HTMLButtonElement;
    const saveSaleBtn = document.getElementById('saveSaleBtn') as HTMLButtonElement;
    const addNewSaleBtn = document.getElementById('addNewSaleBtn') as HTMLButtonElement;
    const generateSummaryBtn = document.getElementById('generateSummaryBtn') as HTMLButtonElement;

    // AI Summary Elements
    const aiSummaryContainer = document.getElementById('aiSummaryContainer') as HTMLElement;
    const aiSummaryLoader = document.getElementById('aiSummaryLoader') as HTMLElement;


    // --- Authentication Logic ---

    // Toggle form visibility
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        registrationForm.style.display = 'block';
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registrationForm.style.display = 'none';
        loginForm.style.display = 'block';
    });

    // Sign up
    signupBtn.addEventListener('click', () => {
        const email = (document.getElementById('regEmail') as HTMLInputElement).value;
        const password = (document.getElementById('regPassword') as HTMLInputElement).value;
        const confirmPassword = (document.getElementById('regConfirmPassword') as HTMLInputElement).value;
        const role = (document.getElementById('regRole') as HTMLSelectElement).value as 'admin' | 'employee';

        if (!email || !password || !confirmPassword) {
            alert('Please fill in all fields.');
            return;
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            alert('Please enter a valid email address.');
            return;
        }
        if (password !== confirmPassword) {
            alert('Passwords do not match.');
            return;
        }

        // Directly save the user
        saveUser(email, password, role);
        alert('Registration successful! Please log in.');
        
        // Hide registration form, show login form
        registrationForm.style.display = 'none';
        loginForm.style.display = 'block';

        // Reset the registration form
        (registrationForm.querySelector('form') as HTMLFormElement).reset();
    });

    // Login
    loginBtn.addEventListener('click', () => {
        const username = (document.getElementById('username') as HTMLInputElement).value;
        const password = (document.getElementById('password') as HTMLInputElement).value;
        const role = (document.getElementById('role') as HTMLSelectElement).value as 'admin' | 'employee';

        if (!username || !password) {
            alert('Please enter a username and password.');
            return;
        }

        if (verifyLogin(username, password, role)) {
            currentUser = { username, role };
            loginPage.style.display = 'none';
            appPage.style.display = 'block';
            initializeApp();
        } else {
            alert('Invalid username, password, or role. Please try again.');
        }
    });

    // Logout
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            appPage.style.display = 'none';
            loginPage.style.display = 'flex';
            currentUser = null;
            (loginForm.querySelector('form') as HTMLFormElement).reset();
        }
    });
    
    // --- Helper Functions (Auth) ---
    function saveUser(email: string, password: string, role: 'admin' | 'employee') {
        const users: StoredUser = JSON.parse(localStorage.getItem('users') || '{}');
        users[email] = { password, role };
        localStorage.setItem('users', JSON.stringify(users));
    }

    function verifyLogin(username: string, password: string, role: 'admin' | 'employee'): boolean {
        const users: StoredUser = JSON.parse(localStorage.getItem('users') || '{}');
        const storedUser = users[username];
        return !!(storedUser && storedUser.password === password && storedUser.role === role);
    }
    
    // --- Data Storage Helper Functions ---
    const getProducts = (): Product[] => JSON.parse(localStorage.getItem('products') || '[]');
    const saveProducts = (products: Product[]) => localStorage.setItem('products', JSON.stringify(products));
    const getCustomers = (): Customer[] => JSON.parse(localStorage.getItem('customers') || '[]');
    const saveCustomers = (customers: Customer[]) => localStorage.setItem('customers', JSON.stringify(customers));
    const getSales = (): Sale[] => JSON.parse(localStorage.getItem('sales') || '[]');
    const saveSales = (sales: Sale[]) => localStorage.setItem('sales', JSON.stringify(sales));

    const formatCurrency = (amount: number) => `€${amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;


    // --- Product Management (CRUD & Search) ---
    function renderProducts() {
        const allProducts = getProducts();
        const searchTerm = productSearchInput.value.toLowerCase();
        
        const filteredProducts = allProducts.filter(product =>
            product.name.toLowerCase().includes(searchTerm) ||
            product.category.toLowerCase().includes(searchTerm)
        );

        const tableBody = document.getElementById('productTableBody') as HTMLTableSectionElement;
        tableBody.innerHTML = ''; // Clear existing rows

        if (filteredProducts.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No products found.</td></tr>';
            return;
        }

        filteredProducts.forEach(product => {
            const statusBadge = product.stock > 10 
                ? `<span class="badge bg-success">In Stock</span>`
                : product.stock > 0 
                ? `<span class="badge bg-warning text-dark">Low Stock</span>`
                : `<span class="badge bg-danger">Out of Stock</span>`;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${product.image || 'https://via.placeholder.com/40'}" class="img-thumbnail" alt="Product" width="40"></td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>${formatCurrency(product.price)}</td>
                <td>${product.stock}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-info btn-action edit-product-btn" data-id="${product.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger btn-action delete-product-btn" data-id="${product.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        document.querySelectorAll('.edit-product-btn').forEach(button => {
            button.addEventListener('click', () => handleEditProduct(button.getAttribute('data-id')!));
        });
        document.querySelectorAll('.delete-product-btn').forEach(button => {
            button.addEventListener('click', () => handleDeleteProduct(button.getAttribute('data-id')!));
        });
    }

    function handleSaveProduct() {
        const id = (document.getElementById('productId') as HTMLInputElement).value;
        const name = (document.getElementById('productName') as HTMLInputElement).value;
        const category = (document.getElementById('productCategory') as HTMLSelectElement).value;
        const price = parseFloat((document.getElementById('productPrice') as HTMLInputElement).value);
        const stock = parseInt((document.getElementById('productStock') as HTMLInputElement).value, 10);
        const image = (document.getElementById('productImage') as HTMLInputElement).value;

        if (!name || !category || isNaN(price) || isNaN(stock)) {
            alert('Please fill in all required fields.');
            return;
        }

        let products = getProducts();
        if (id) {
            const index = products.findIndex(p => p.id === id);
            if (index > -1) {
                products[index] = { ...products[index], name, category, price, stock, image };
            }
        } else {
            const newProduct: Product = { id: Date.now().toString(), name, category, price, stock, image };
            products.push(newProduct);
        }

        saveProducts(products);
        renderProducts();
        updateDashboard();
        productModal.hide();
    }

    function handleEditProduct(id: string) {
        const products = getProducts();
        const product = products.find(p => p.id === id);
        if (!product) return;

        (document.getElementById('productId') as HTMLInputElement).value = product.id;
        (document.getElementById('productName') as HTMLInputElement).value = product.name;
        (document.getElementById('productCategory') as HTMLSelectElement).value = product.category;
        (document.getElementById('productPrice') as HTMLInputElement).value = product.price.toString();
        (document.getElementById('productStock') as HTMLInputElement).value = product.stock.toString();
        (document.getElementById('productImage') as HTMLInputElement).value = product.image;
        (document.getElementById('productModalTitle') as HTMLElement).textContent = 'Edit Product';
        
        productModal.show();
    }

    function handleDeleteProduct(id: string) {
        if (confirm('Are you sure you want to delete this product?')) {
            let products = getProducts();
            products = products.filter(p => p.id !== id);
            saveProducts(products);
            renderProducts();
            updateDashboard();
        }
    }

    // --- Customer Management (CRUD) ---
    function renderCustomers() {
        const customers = getCustomers();
        const tableBody = document.getElementById('customerTableBody') as HTMLTableSectionElement;
        tableBody.innerHTML = '';

        if (customers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No customers found.</td></tr>';
            return;
        }

        customers.forEach(customer => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${customer.name}</td>
                <td>${customer.email}</td>
                <td>${customer.phone}</td>
                <td>
                    <button class="btn btn-sm btn-info btn-action edit-customer-btn" data-id="${customer.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger btn-action delete-customer-btn" data-id="${customer.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        document.querySelectorAll('.edit-customer-btn').forEach(button => {
            button.addEventListener('click', () => handleEditCustomer(button.getAttribute('data-id')!));
        });
        document.querySelectorAll('.delete-customer-btn').forEach(button => {
            button.addEventListener('click', () => handleDeleteCustomer(button.getAttribute('data-id')!));
        });
    }

    function handleSaveCustomer() {
        const id = (document.getElementById('customerId') as HTMLInputElement).value;
        const name = (document.getElementById('customerName') as HTMLInputElement).value;
        const email = (document.getElementById('customerEmail') as HTMLInputElement).value;
        const phone = (document.getElementById('customerPhone') as HTMLInputElement).value;

        if (!name || !email || !phone) {
            alert('Please fill in all fields.');
            return;
        }

        let customers = getCustomers();
        if (id) {
            const index = customers.findIndex(c => c.id === id);
            if (index > -1) {
                customers[index] = { ...customers[index], name, email, phone };
            }
        } else {
            const newCustomer: Customer = { id: Date.now().toString(), name, email, phone };
            customers.push(newCustomer);
        }

        saveCustomers(customers);
        renderCustomers();
        updateDashboard();
        customerModal.hide();
    }

    function handleEditCustomer(id: string) {
        const customers = getCustomers();
        const customer = customers.find(c => c.id === id);
        if (!customer) return;

        (document.getElementById('customerId') as HTMLInputElement).value = customer.id;
        (document.getElementById('customerName') as HTMLInputElement).value = customer.name;
        (document.getElementById('customerEmail') as HTMLInputElement).value = customer.email;
        (document.getElementById('customerPhone') as HTMLInputElement).value = customer.phone;
        (document.getElementById('customerModalTitle') as HTMLElement).textContent = 'Edit Customer';
        
        customerModal.show();
    }

    function handleDeleteCustomer(id: string) {
        if (confirm('Are you sure you want to delete this customer?')) {
            let customers = getCustomers();
            customers = customers.filter(c => c.id !== id);
            saveCustomers(customers);
            renderCustomers();
            updateDashboard();
        }
    }

    // --- Sales Management ---
    function renderSales() {
        const sales = getSales().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const tableBody = document.getElementById('salesTableBody') as HTMLTableSectionElement;
        tableBody.innerHTML = '';

        if (sales.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No sales recorded.</td></tr>';
            return;
        }

        sales.forEach(sale => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${sale.id.slice(-6)}</td>
                <td>${sale.customerName}</td>
                <td>${sale.productName}</td>
                <td>${sale.quantity}</td>
                <td>${formatCurrency(sale.totalPrice)}</td>
                <td>${new Date(sale.date).toLocaleDateString('en-GB')}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    function openSaleModal() {
        const customerSelect = document.getElementById('saleCustomer') as HTMLSelectElement;
        const productSelect = document.getElementById('saleProduct') as HTMLSelectElement;
        const quantityInput = document.getElementById('saleQuantity') as HTMLInputElement;
        const totalPriceEl = document.getElementById('saleTotalPrice') as HTMLElement;
        
        // Populate customers
        customerSelect.innerHTML = '<option value="" disabled selected>Select Customer</option>';
        getCustomers().forEach(c => {
            customerSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });

        // Populate products (only with stock)
        productSelect.innerHTML = '<option value="" disabled selected>Select Product</option>';
        getProducts().filter(p => p.stock > 0).forEach(p => {
            productSelect.innerHTML += `<option value="${p.id}">${p.name} (Stock: ${p.stock})</option>`;
        });

        // Reset fields
        (document.getElementById('saleForm') as HTMLFormElement).reset();
        totalPriceEl.textContent = formatCurrency(0);

        // Calculate price on change
        const calculatePrice = () => {
            const selectedProduct = getProducts().find(p => p.id === productSelect.value);
            const quantity = parseInt(quantityInput.value, 10);
            if (selectedProduct && quantity > 0) {
                totalPriceEl.textContent = formatCurrency(selectedProduct.price * quantity);
            } else {
                totalPriceEl.textContent = formatCurrency(0);
            }
        };

        productSelect.onchange = calculatePrice;
        quantityInput.oninput = calculatePrice;
    }

    function handleSaveSale() {
        const customerId = (document.getElementById('saleCustomer') as HTMLSelectElement).value;
        const productId = (document.getElementById('saleProduct') as HTMLSelectElement).value;
        const quantity = parseInt((document.getElementById('saleQuantity') as HTMLInputElement).value, 10);

        const customer = getCustomers().find(c => c.id === customerId);
        const product = getProducts().find(p => p.id === productId);

        if (!customer || !product || isNaN(quantity) || quantity <= 0) {
            alert('Please select a customer, product, and enter a valid quantity.');
            return;
        }

        if (quantity > product.stock) {
            alert(`Not enough stock. Only ${product.stock} units available.`);
            return;
        }

        // Update product stock
        const products = getProducts();
        const productIndex = products.findIndex(p => p.id === productId);
        products[productIndex].stock -= quantity;
        saveProducts(products);

        // Record the sale
        const newSale: Sale = {
            id: Date.now().toString(),
            customerId,
            customerName: customer.name,
            productId,
            productName: product.name,
            quantity,
            totalPrice: product.price * quantity,
            date: new Date().toISOString()
        };
        const sales = getSales();
        sales.push(newSale);
        saveSales(sales);

        // Update UI
        renderSales();
        renderProducts(); // To show updated stock
        updateDashboard();
        renderReports();
        saleModal.hide();
    }


    // --- AI Summary Generation ---
    async function handleGenerateAISummary() {
        aiSummaryContainer.style.display = 'none';
        aiSummaryLoader.classList.remove('d-none');
        generateSummaryBtn.disabled = true;

        try {
            const sales = getSales();
            const products = getProducts();

            // Calculate summary data
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const dayOfWeek = now.getDay();
            const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const weekStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate() + diffToMonday);
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

            const dailyTotal = sales.filter(s => new Date(s.date) >= todayStart).reduce((sum, s) => sum + s.totalPrice, 0);
            const weeklyTotal = sales.filter(s => new Date(s.date) >= weekStart).reduce((sum, s) => sum + s.totalPrice, 0);
            const monthlyTotal = sales.filter(s => new Date(s.date) >= monthStart).reduce((sum, s) => sum + s.totalPrice, 0);
            
            const categoryData: { [key: string]: { total: number, quantity: number } } = {};
            sales.forEach(sale => {
                const product = products.find(p => p.id === sale.productId);
                if (product && product.category) {
                    const category = product.category;
                    if (!categoryData[category]) {
                        categoryData[category] = { total: 0, quantity: 0 };
                    }
                    categoryData[category].total += sale.totalPrice;
                    categoryData[category].quantity += sale.quantity;
                }
            });
            const categorySummary = Object.entries(categoryData)
                .map(([cat, data]) => `${cat}: ${formatCurrency(data.total)} (${data.quantity} items)`)
                .join('; ');

            const prompt = `
                You are a helpful business analyst for a small retail shop.
                Analyze the following sales data and provide a concise, insightful summary (around 100 words) of the shop's performance.
                Please use markdown formatting. In your summary, highlight key trends, mention top-performing categories, and suggest one actionable area for improvement.

                **Sales Data:**
                - Today's Sales: ${formatCurrency(dailyTotal)}
                - This Week's Sales: ${formatCurrency(weeklyTotal)}
                - This Month's Sales: ${formatCurrency(monthlyTotal)}
                - Sales by Category: ${categorySummary || 'No category sales yet.'}
            `;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            
            const summaryText = response.text;
            let html = summaryText
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/^- (.*$)/gm, '<ul><li>$1</li></ul>')
                .replace(/<\/ul>\n<ul>/g, '')
                .replace(/\n/g, '<br>');

            aiSummaryContainer.innerHTML = html;

        } catch (error) {
            console.error('AI Summary Generation Failed:', error);
            aiSummaryContainer.innerHTML = `
                <div class="alert alert-danger">
                    <strong>Error:</strong> Could not generate AI summary. Please try again later.
                </div>`;
        } finally {
            aiSummaryContainer.style.display = 'block';
            aiSummaryLoader.classList.add('d-none');
            generateSummaryBtn.disabled = false;
        }
    }


    // --- App Initialization and UI Logic ---
    
    function updateDashboard() {
        const products = getProducts();
        const sales = getSales();
    
        // --- Calculate New Metrics ---
        // 1. Monthly Income
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyIncome = sales
            .filter(s => new Date(s.date) >= monthStart)
            .reduce((sum, s) => sum + s.totalPrice, 0);
    
        // 2. Total Items Sold
        const totalItemsSold = sales.reduce((sum, sale) => sum + sale.quantity, 0);
    
        // 3. Product Categories
        const productCategories = new Set(products.map(p => p.category)).size;
    
        // 4. Total Products
        const totalProducts = products.length;
    
        // --- Update Dashboard Cards ---
        (document.getElementById('monthlyIncomeValue') as HTMLElement).textContent = formatCurrency(monthlyIncome);
        (document.getElementById('totalItemsSoldCount') as HTMLElement).textContent = totalItemsSold.toString();
        (document.getElementById('productCategoriesCount') as HTMLElement).textContent = productCategories.toString();
        (document.getElementById('totalProductsCount') as HTMLElement).textContent = totalProducts.toString();
    
        // --- Update Recent Transactions ---
        const recentTransactionsBody = document.getElementById('recentTransactionsBody') as HTMLTableSectionElement;
        recentTransactionsBody.innerHTML = '';
        sales.slice(-5).reverse().forEach(sale => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${sale.id.slice(-6)}</td>
                <td>${sale.customerName}</td>
                <td>${new Date(sale.date).toLocaleDateString('en-GB')}</td>
                <td>${formatCurrency(sale.totalPrice)}</td>
                <td><span class="badge bg-success">Completed</span></td>
            `;
            recentTransactionsBody.appendChild(row);
        });
    
        // --- Update Top Products ---
        const topProductsList = document.getElementById('topProductsList') as HTMLUListElement;
        const productSales: { [key: string]: number } = {};
        sales.forEach(sale => {
            productSales[sale.productName] = (productSales[sale.productName] || 0) + sale.quantity;
        });
        const sortedProducts = Object.entries(productSales).sort(([, a], [, b]) => b - a);
        
        topProductsList.innerHTML = '';
        sortedProducts.slice(0, 5).forEach(([name, quantity]) => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `${name} <span class="badge bg-primary rounded-pill">${quantity}</span>`;
            topProductsList.appendChild(li);
        });
    
        // --- Update Sales Chart ---
        updateSalesChart(sales);
    }

    function initializeApp() {
        if (!currentUser) return;
        
        (document.getElementById('userName') as HTMLElement).textContent = currentUser.username;
        (document.getElementById('userRole') as HTMLElement).textContent = currentUser.role === 'admin' ? 'Admin' : 'Employee';

        const now = new Date();
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        (document.getElementById('currentDate') as HTMLElement).textContent = now.toLocaleDateString('en-GB', options);
        
        document.querySelectorAll<HTMLElement>('.admin-only').forEach(el => {
            el.style.display = currentUser!.role === 'admin' ? 'block' : 'none';
        });

        document.querySelectorAll<HTMLAnchorElement>('.nav-link[data-section]').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelectorAll('.nav-link').forEach(navLink => navLink.classList.remove('active'));
                this.classList.add('active');
                
                const targetSectionId = this.getAttribute('data-section');
                document.querySelectorAll<HTMLElement>('.content-section').forEach(section => {
                    section.classList.remove('active');
                });
                const targetSection = document.getElementById(targetSectionId!);
                if (targetSection) {
                    targetSection.classList.add('active');
                    if (targetSectionId === 'reports') {
                        salesSummaryChartInstance?.update();
                        categorySalesChartInstance?.update();
                    }
                }
                
                (document.getElementById('pageTitle') as HTMLElement).textContent = this.textContent!.trim();
            });
        });
        
        // Initialize Modals
        productModal = new bootstrap.Modal(document.getElementById('addProductModal'));
        customerModal = new bootstrap.Modal(document.getElementById('customerModal'));
        saleModal = new bootstrap.Modal(document.getElementById('addSaleModal'));

        // Event Listeners
        saveProductBtn.addEventListener('click', handleSaveProduct);
        addNewProductBtn.addEventListener('click', () => {
            (document.getElementById('productForm') as HTMLFormElement).reset();
            (document.getElementById('productId') as HTMLInputElement).value = '';
            (document.getElementById('productModalTitle') as HTMLElement).textContent = 'Add New Product';
        });

        saveCustomerBtn.addEventListener('click', handleSaveCustomer);
        addNewCustomerBtn.addEventListener('click', () => {
            (document.getElementById('customerForm') as HTMLFormElement).reset();
            (document.getElementById('customerId') as HTMLInputElement).value = '';
            (document.getElementById('customerModalTitle') as HTMLElement).textContent = 'Add New Customer';
        });

        saveSaleBtn.addEventListener('click', handleSaveSale);
        addNewSaleBtn.addEventListener('click', openSaleModal);

        productSearchInput.addEventListener('input', renderProducts);
        generateSummaryBtn.addEventListener('click', handleGenerateAISummary);


        // Initial render
        renderProducts();
        renderCustomers();
        renderSales();
        updateDashboard();
        initializeSalesChart();
        initializeReportCharts();
        renderReports();
    }

    function initializeSalesChart() {
        const ctx = (document.getElementById('salesChart') as HTMLCanvasElement).getContext('2d');
        if(!ctx) return;
        salesChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [], // Initial empty labels
                datasets: [{
                    label: 'Monthly Sales',
                    data: [], // Initial empty data
                    backgroundColor: 'rgba(253, 126, 20, 0.2)',
                    borderColor: 'rgba(253, 126, 20, 1)',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: 'rgba(253, 126, 20, 1)'
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value: number | string) => '€ ' + Number(value).toLocaleString('de-DE')
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    function updateSalesChart(sales: Sale[]) {
        if (!salesChartInstance) return;

        // Group sales by month
        const monthlySales: { [key: string]: number } = {};
        sales.forEach(sale => {
            const month = new Date(sale.date).toLocaleString('default', { month: 'long', year: 'numeric' });
            monthlySales[month] = (monthlySales[month] || 0) + sale.totalPrice;
        });

        const labels = Object.keys(monthlySales);
        const data = Object.values(monthlySales);

        salesChartInstance.data.labels = labels;
        salesChartInstance.data.datasets[0].data = data;
        salesChartInstance.update();
    }

    // --- Reports Section ---
    function initializeReportCharts() {
        const summaryCtx = (document.getElementById('salesSummaryChart') as HTMLCanvasElement)?.getContext('2d');
        if (summaryCtx) {
            salesSummaryChartInstance = new Chart(summaryCtx, {
                type: 'bar',
                data: {
                    labels: ['Today', 'This Week', 'This Month'],
                    datasets: [{
                        label: 'Total Sales',
                        data: [0, 0, 0],
                        backgroundColor: [
                            'rgba(75, 192, 192, 0.5)',
                            'rgba(54, 162, 235, 0.5)',
                            'rgba(253, 126, 20, 0.5)'
                        ],
                        borderColor: [
                           'rgb(75, 192, 192)',
                           'rgb(54, 162, 235)',
                           'rgb(253, 126, 20)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { callback: (value: number | string) => formatCurrency(Number(value)) } } }
                }
            });
        }

        const categoryCtx = (document.getElementById('categorySalesChart') as HTMLCanvasElement)?.getContext('2d');
        if (categoryCtx) {
            categorySalesChartInstance = new Chart(categoryCtx, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Sales by Category',
                        data: [],
                        backgroundColor: ['#fd7e14', '#3f37c9', '#4cc9f0', '#f72585', '#7209b7', '#ffbe0b', '#fb5607'],
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'top' },
                        tooltip: {
                            callbacks: {
                                label: function(context: any) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed !== null) {
                                        label += formatCurrency(context.parsed);
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    function renderReports() {
        const sales = getSales();
        const products = getProducts();
        
        // --- Sales Summary Calculations ---
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate() + diffToMonday);
        
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const dailyTotal = sales.filter(s => new Date(s.date) >= todayStart).reduce((sum, s) => sum + s.totalPrice, 0);
        const weeklyTotal = sales.filter(s => new Date(s.date) >= weekStart).reduce((sum, s) => sum + s.totalPrice, 0);
        const monthlyTotal = sales.filter(s => new Date(s.date) >= monthStart).reduce((sum, s) => sum + s.totalPrice, 0);

        (document.getElementById('dailySalesTotal') as HTMLElement).textContent = formatCurrency(dailyTotal);
        (document.getElementById('weeklySalesTotal') as HTMLElement).textContent = formatCurrency(weeklyTotal);
        (document.getElementById('monthlySalesTotal') as HTMLElement).textContent = formatCurrency(monthlyTotal);

        if (salesSummaryChartInstance) {
            salesSummaryChartInstance.data.datasets[0].data = [dailyTotal, weeklyTotal, monthlyTotal];
            salesSummaryChartInstance.update();
        }

        // --- Category Analysis ---
        const categoryData: { [key: string]: { total: number, quantity: number } } = {};

        sales.forEach(sale => {
            const product = products.find(p => p.id === sale.productId);
            if (product && product.category) {
                const category = product.category;
                if (!categoryData[category]) {
                    categoryData[category] = { total: 0, quantity: 0 };
                }
                categoryData[category].total += sale.totalPrice;
                categoryData[category].quantity += sale.quantity;
            }
        });

        const categoryTableBody = document.getElementById('categorySalesTableBody') as HTMLTableSectionElement;
        if (!categoryTableBody) return;

        categoryTableBody.innerHTML = '';
        const sortedCategories = Object.entries(categoryData).sort(([, a], [, b]) => b.total - a.total);

        if (sortedCategories.length === 0) {
            categoryTableBody.innerHTML = '<tr><td colspan="3" class="text-center">No sales data for categories.</td></tr>';
        } else {
            sortedCategories.forEach(([category, data]) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${category}</td>
                    <td>${formatCurrency(data.total)}</td>
                    <td>${data.quantity}</td>
                `;
                categoryTableBody.appendChild(row);
            });
        }

        if (categorySalesChartInstance) {
            categorySalesChartInstance.data.labels = sortedCategories.map(([category]) => category);
            categorySalesChartInstance.data.datasets[0].data = sortedCategories.map(([, data]) => data.total);
            categorySalesChartInstance.update();
        }
    }
});