# Requirements brief — E-Commerce Platform
## Profile
A fully functional, enterprise-grade e-commerce web application with a customer storefront and an administrative dashboard, built with Angular and Flask, running locally with SQLite. · web app · e-commerce · size: large · depth: thorough · money, personalData, publicUsers, files
- **Has a user interface?** Yes (The app has a customer storefront and an admin dashboard with many UI components.)
- **Runs locally?** Yes (It is a web app whose Angular storefront and Flask API Greenfield can start on the person's machine with SQLite.)
## The app
A locally run e-commerce web app with an Angular storefront where customers browse, search, cart, check out with a mock payment and track orders, and a Flask API over SQLite behind it. A separate admin dashboard lets the team manage products, categories, stock, orders, coupons, reviews and reports, with role-based access and an audit trail.
## Ruled out by the person
- OUT1 cloud hosting: "No cloud hosting or production deployment." (description) [no requirement, design, task or code for it]
- OUT2 external cloud infrastructure: "No dependency on external cloud infrastructure." (description) [no requirement, design, task or code for it]
## Goals and success
- G1 Build a fully functional, enterprise-grade e-commerce web application with a premium user experience, robust backend, and comprehensive admin dashboard. (description)
- M1 Customers can browse, buy and track orders without help, and the admin team can manage products, orders and stock from the dashboard. (By the end of the first release: at least 30 products across 8 categories, 5 demo accounts, and every critical workflow passing its automated test) [assumed] (Q8, assumption)
## Roles
- R1 Super Admin (1) (description, assumption)
- R2 Admin (2) (description, assumption)
- R3 Inventory Manager (1) (description, assumption)
- R4 Order Manager (1) (description, assumption)
- R5 Customer (100) (description, assumption)
- R6 Guest shopper (200) [never signs in to the app] [assumed] (assumption)
## Permissions
- R1 Super Admin may manage admin users and permissions, manage products, manage orders, manage inventory, view reports (assumption)
- R2 Admin may manage products, manage orders, view reports (assumption)
- R3 Inventory Manager may manage inventory (assumption)
- R4 Order Manager may manage orders (assumption)
- R5 Customer may place an order, cancel an order before shipping, submit a review (assumption, Q3, Q9, Q5)
## Business events
- EV1 A customer places an order: stock is reserved, the order is created and the mock payment is taken. [assumed] (assumption)
- EV2 A customer cancels an order before shipping: reserved stock is released and the mock payment is refunded in full. (Q10, Q11)
- EV3 Stock falls to or below its low-stock threshold: the inventory manager sees a low-stock alert. [assumed] (assumption)
- EV4 A coupon passes its expiry date: it stops being usable at checkout. [assumed] (assumption)
- EV5 A password reset token passes its expiry: it can no longer be used. [assumed] (assumption)
## Workflows
### W1 Customer registration and login (release 1) — actors: R5 Customer; trigger: Customer visits the site and registers or logs in; outcome: Customer is authenticated and can shop; how often: About 10 new registrations a week and 50 logins a day; module: auth (description, assumption)
1. Customer fills registration form with email, password, and personal details
2. System validates email uniqueness and password strength
3. System creates user account with hashed password
4. Customer logs in with email and password
5. System issues JWT access and refresh tokens
6. Customer accesses protected pages
- Email already exists, weak password, invalid credentials
### W2 Product browsing and search (release 1) — actors: R5 Customer; trigger: Customer visits storefront; outcome: Customer finds products of interest; how often: About 500 product views a day; module: storefront (description, assumption)
1. Customer browses categories or uses search bar
2. System returns product list with filters and sorting
3. Customer applies filters (category, brand, price, rating, availability)
4. Customer views product details page
- No results found
### W3 Add to cart and checkout (release 1) — actors: R5 Customer; trigger: Customer decides to purchase; outcome: Order is placed and payment simulated; how often: About 20 orders a day; module: checkout (description, assumption)
1. Customer adds products to cart
2. Customer views cart and updates quantities
3. Customer proceeds to checkout
4. Customer enters shipping and billing information
5. Customer selects delivery method
6. Customer reviews order
7. Customer selects payment method (mock)
8. System validates stock and creates order
9. System processes mock payment
10. Customer receives order confirmation
- Out of stock, payment failure, invalid coupon
### W4 Admin product management (release 1) — actors: R2 Admin, R1 Super Admin; trigger: Admin needs to add or update products; outcome: Product catalog is updated; how often: A few product changes a day; module: admin (description, assumption)
1. Admin logs into admin dashboard
2. Admin navigates to product management
3. Admin creates or edits product details
4. Admin uploads product images
5. Admin sets pricing, stock, and variants
6. Admin publishes or unpublishes product
- Duplicate SKU, validation errors
### W5 Admin order management (release 1) — actors: R4 Order Manager, R2 Admin; trigger: New order placed or status update needed; outcome: Orders are managed and fulfilled; how often: About 20 orders reviewed a day; module: admin (description, assumption)
1. Admin views order list
2. Admin searches or filters orders
3. Admin views order details
4. Admin updates order status
5. Admin processes refund if needed
6. Admin generates invoice or exports report
- Invalid status transition, refund failure
### W6 Inventory management (release 1) — actors: R3 Inventory Manager; trigger: Stock level changes or restock needed; outcome: Inventory levels are accurate; how often: A stock adjustment most days; module: admin (description, assumption)
1. Inventory manager views inventory overview
2. Manager adjusts stock quantities
3. System records inventory movement
4. Manager views low-stock alerts
- Negative stock, concurrent updates
### W7 Review moderation (release 1) — actors: R2 Admin; trigger: A customer submits a review; outcome: Only approved reviews are shown; how often: A few reviews a week; module: admin (Q5, assumption)
1. Admin opens the review queue
2. Admin reads the review and checks it against the product
3. Admin approves or rejects the review
4. Approved reviews appear on the product page and update the average rating
- A review that is rejected never appears
### W8 Coupon management (release 1) — actors: R2 Admin; trigger: A promotion is planned; outcome: Coupons are applied only when valid; how often: A few coupons a month; module: admin [assumed] (assumption)
1. Admin creates a coupon with type, value, limits and expiry
2. Admin activates the coupon
3. Customers apply the code at checkout and the backend validates it
4. Admin reviews redemption tracking
- Expired, over-limit or restricted coupons are refused
### W9 Reporting (release 1) — actors: R2 Admin, R1 Super Admin; trigger: A business review or a question about sales; outcome: The team sees sales, product and inventory performance; how often: Weekly; module: admin [assumed] (assumption)
1. Admin opens the reports module
2. Admin picks a date range and report
3. System runs the database query and shows charts and tables
4. Admin exports the report to CSV or prints it
- No data in the range shows an empty state
## Records
- E1 User. fields: id, email, password_hash, first_name, last_name, phone, is_active, created_at, updated_at; states: active → inactive; owner: admin (description)
- E2 Role. fields: id, name, description; owner: admin; how many: 5 (description)
- E3 Permission. fields: id, name, description; owner: admin (description)
- E4 Category. fields: id, name, description, image_url, parent_id, status, order; states: active → inactive; owner: admin; how many: at least 8 (description)
- E5 Brand. fields: id, name, description, logo_url; owner: admin; how many: multiple (description)
- E6 Product. fields: id, name, sku, description, short_description, brand_id, category_id, regular_price, discounted_price, discount_percentage, stock_quantity, status, is_featured, is_new_arrival, created_at, updated_at; states: draft → published → archived; owner: admin; how many: at least 30 (description)
- E7 ProductImage. fields: id, product_id, url, alt_text, order; owner: admin; how many: multiple per product (description)
- E8 ProductVariant. fields: id, product_id, sku, price, stock_quantity, attributes; states: draft → published → archived; owner: admin; how many: multiple per product (description, Q1)
- E9 ProductAttribute. fields: id, name; owner: admin (description)
- E10 ProductAttributeValue. fields: id, attribute_id, value; owner: admin (description)
- E11 Inventory. fields: id, product_id, variant_id, quantity, reserved_quantity, available_quantity, low_stock_threshold; states: available → reserved → sold; owner: inventory manager; how many: one per product/variant (description, Q2)
- E12 InventoryMovement. fields: id, inventory_id, quantity_change, reason, created_at, created_by; owner: inventory manager (description)
- E13 Address. fields: id, user_id, type, line1, line2, city, state, postal_code, country, is_default; owner: customer; how many: multiple per customer (description)
- E14 Cart. fields: id, user_id, created_at, updated_at; states: active → converted → abandoned; owner: customer; how many: one per customer (description)
- E15 CartItem. fields: id, cart_id, product_id, variant_id, quantity, price; owner: customer; how many: multiple per cart (description)
- E16 Wishlist. fields: id, user_id, created_at; owner: customer; how many: one per customer (description)
- E17 WishlistItem. fields: id, wishlist_id, product_id, added_at; owner: customer; how many: multiple per wishlist (description)
- E18 Order. fields: id, order_number, user_id, status, total_amount, shipping_address_id, billing_address_id, payment_status, created_at, updated_at; states: pending → confirmed → processing → shipped → delivered → cancelled → refunded; owner: customer (description)
- E19 OrderItem. fields: id, order_id, product_id, variant_id, quantity, unit_price, total_price; owner: customer; how many: multiple per order (description)
- E20 OrderStatusHistory. fields: id, order_id, status, changed_at, changed_by; owner: system; how many: multiple per order (description)
- E21 Payment. fields: id, order_id, amount, status, method, transaction_id, created_at; states: pending → success → failed → cancelled → refunded; owner: system; how many: one per order (description)
- E22 Coupon. fields: id, code, type, value, min_order_value, max_discount, expires_at, usage_limit, per_customer_limit, is_active; states: active → inactive → expired; owner: admin (description)
- E23 CouponRedemption. fields: id, coupon_id, user_id, order_id, redeemed_at; owner: system (description)
- E24 Review. fields: id, product_id, user_id, rating, comment, is_verified_purchase, status, created_at; states: pending → approved → rejected; owner: customer (description, Q5)
- E25 AuditLog. fields: id, user_id, action, entity_type, entity_id, details, created_at; owner: system (description)
- E26 PasswordResetToken. fields: id, user_id, token, expires_at, used; states: valid → used → expired; owner: system (description)
## Rules
- BR1 Cart and order totals must be calculated on the backend using trusted logic, not trusting frontend-submitted prices.. Applies: When a customer updates cart or places an order, the backend recalculates totals.. Does not apply: Frontend may display estimated totals but they are not authoritative. (description)
- BR2 Inventory must be updated transactionally to prevent overselling.. Applies: When an order is placed, stock is reserved or decremented within a transaction.. Does not apply: Browsing products does not change inventory. (description)
- BR3 Customers cannot access administrative endpoints or other customers' private information.. Applies: A customer trying to access /api/v1/admin/* is denied.. Does not apply: Admins can access admin endpoints. (description)
- BR4 Coupons must be validated on the backend.. Applies: When a coupon code is applied, backend checks validity, expiry, usage limits, and restrictions.. Does not apply: Frontend may show a preliminary check but backend is authoritative. (description)
- BR5 Never store raw card numbers, CVVs, or sensitive payment credentials.. Applies: Payment processing uses a mock gateway; no card data is stored.. Does not apply: Not applicable. (description)
- BR6 Stock is reserved at checkout so the same unit cannot be sold twice.. Applies: When a customer proceeds to checkout, the stock for each item is reserved before the order is confirmed.. Does not apply: Browsing a product page does not reserve any stock. (Q2)
- BR7 Customers may cancel an order only before it is shipped.. Applies: A customer cancels an order that has not yet been shipped.. Does not apply: A customer cannot cancel an order that has already been shipped. (Q3, Q9)
- BR8 Product reviews appear on the storefront only after an admin approves them.. Applies: A customer submits a review and it waits in a pending state until an admin approves it.. Does not apply: A review that an admin rejects never appears on the product page. (Q5)
- BR9 When a customer cancels an order, the reserved stock is released and the mock payment is refunded.. Applies: A customer cancels an order before it is shipped: the reserved stock goes back to available and the mock payment is refunded.. Does not apply: An order that has already shipped cannot be cancelled, so no stock is released and no refund is made. (Q10)
- BR10 When a customer cancels an order before it is shipped, the mock payment is refunded in full, including shipping and tax.. Applies: A customer cancels an order that has not yet shipped: the full amount paid is refunded.. Does not apply: An order that has already shipped cannot be cancelled, so no refund is made. [assumed] (Q11)
- BR11 The mock refund is recorded immediately when the order is cancelled, without waiting for an admin.. Applies: A customer cancels an order before shipping: the payment record moves to refunded at once.. Does not apply: An order that has already shipped is not cancelled, so no refund is recorded. [assumed] (Q12)
## Quality targets
- N1 [access_i18n] The storefront and admin dashboard meet WCAG 2.2 AA accessibility.: WCAG 2.2 AA accessibility level (Q6)
- N2 [money] The mock payment gateway simulates credit card payments only.: credit card only payment method (Q4)
- N3 [performance] Product pages and search results load in under 2 seconds on a local machine.: 2 seconds [assumed] (assumption)
- N4 [performance] Checkout completes in under 3 seconds.: 3 seconds [assumed] (assumption)
## Reports
- RP1 Revenue report by day, week, month, quarter and year, read by Admin and Super Admin, fresh to the last order. [assumed] (assumption)
- RP2 Product and category performance report, read by Admin, fresh daily. [assumed] (assumption)
- RP3 Inventory report with low-stock and out-of-stock items, read by Inventory Manager, fresh to the last movement. [assumed] (assumption)
## Scope and constraints
- S3 Must use Angular, Flask, SQLite, and run locally. [constraint] (description)
## Decisions
- **Stack:** Angular, Flask and SQLite (decided by Greenfield; suggested: The description fixes Angular, Flask and SQLite, and they run locally with no cloud services.) (Q13)
- **Deploy target:** No deploy for now (as the user's description or documents say, description: "No cloud hosting or production deployment.") (Q7)
## Assumptions
- A1 The store sells physical goods in one currency to US customers. — The description names shipping, tax and delivery but no country or currency.; high impact [assumed] (assumption)
- A2 There is one business, not many customer organisations. — The description has one admin dashboard and no sign-up for organisations.; high impact [assumed] (assumption)
- A3 A cancelled order is refunded in full, including shipping and tax. — The customer never received the goods, so keeping shipping or tax would be unfair and hard to justify.; high impact [assumed] (assumption, Q11)
- A4 The mock refund is recorded immediately when the order is cancelled. — The mock gateway has no real money to move, so an immediate record keeps the order and payment states consistent.; high impact [assumed] (assumption, Q12)
## Risks
- K1 Overselling if stock is not reserved transactionally. [assumed] (assumption)
- K2 A customer reaching admin data or another customer's details. [assumed] (assumption)
- K3 SQLite locking under concurrent checkout writes. [assumed] (assumption)
- K4 Scope creep from the very large spec delaying a working first release. [assumed] (assumption)
## Other facts
- F1 The application must run locally without cloud hosting or external cloud infrastructure. (description)
- F2 The technology stack is fixed: Angular frontend, Flask backend, SQLite database. (description)
- F3 The app includes sample data, demo accounts, automated tests, and documentation. (description)
- F4 Today the shop runs on a spreadsheet and a hosted storefront; orders arrive by email and stock is counted by hand. [current] [assumed] (assumption)
- F5 The top pains today are overselling, slow order updates and no single view of stock. [current] [assumed] (assumption)
- F6 The closest products are Shopify and Amazon; copy their clear product pages and simple checkout, avoid their heavy template look. [similar] [assumed] (assumption)
- F7 Admins can change products, categories, coupons, order statuses, stock and review approvals without a developer; the Super Admin also manages admin users and permissions. [admin] [assumed] (assumption)
- F8 Prices are set in one currency (USD) and stored in integer minor units; tax is estimated at checkout; invoices are printable from an order. [money] [assumed, high impact] (assumption)
- F9 Product images are JPEG or PNG up to 5 MB each, seen by everyone, kept while the product exists. [files] [assumed] (assumption)
- F10 At the busiest moment about 20 people shop at once; year 1 holds about 100 customers, 500 orders and 30 products; year 3 about 1,000 customers, 5,000 orders and 200 products. [scale] [assumed] (assumption)
- F11 The app runs locally only, so an hour of outage costs nothing in money; data loss must be zero and recovery is a restart. [availability] [assumed] (assumption)
- F12 People sign in with email and password; admins use the same sign-in with their role; the worst misuse is a customer reaching admin data or another customer's details. [security] [assumed, high impact] (assumption)
- F13 Personal data held: name, email, phone, addresses and order history; users are in the US; data is kept while the account exists; customers can ask an admin to delete their account. [privacy] [assumed, high impact] (assumption)
- F14 Every admin change to products, orders, stock and users is logged with who did it and when, kept for the life of the local database. [audit] [assumed, high impact] (assumption)
- F15 The app is used on desktop and phone browsers; it does not work offline. [devices] [assumed] (assumption)
- F16 The person running the app locally is alerted by the console and log file when something breaks; support can see the audit log and act as a user only by signing in as an admin. [operations] [assumed] (assumption)
## Out of scope and later releases
- S1 No cloud hosting or production deployment. [out of scope] (description)
- S2 No dependency on external cloud infrastructure. [out of scope] (description)
- Hosting and deployment: not relevant, the user said so [out of scope]
## The interview
- Q1 [entities · owner] Should the app support multiple product variants (e.g., size, color) with independent stock? → Yes, with independent SKU and inventory
- Q2 [rules · owner] How should stock be handled during checkout to prevent overselling? → Reserve stock at checkout
- Q3 [workflows · owner] Should customers be able to cancel orders after placement? → Yes, under certain conditions
- Q4 [money · owner] What payment methods should the mock gateway simulate? → Credit card only
- Q5 [workflows · owner] Should product reviews require admin approval before appearing? → Yes, moderation required
- Q6 [access_i18n · owner] What level of accessibility should the app target? → WCAG 2.2 AA
- Q8 [success · owner] When this storefront and admin dashboard are finished, what would tell you they are working well? → Customers can browse, buy and track orders without help, and the admin team can manage products, orders and stock from the dashboard. (Greenfield's draft, sent unchanged)
- Q9 [workflows · role:R1] Up to which point may a customer cancel an order themselves? → Before the order is shipped
- Q10 [workflows · role:R1] When a customer cancels an order, what should happen to the reserved stock and the mock payment? → Release stock and refund the mock payment
- Q11 [money · finance] When an order is cancelled before shipping, how much of the mock payment should be refunded? → Decide for me (settled: The full amount paid, including shipping and tax)
- Q12 [money · finance] In the mock gateway, when should the refund be recorded after a customer cancels an order? → Decide for me (settled: Immediately, as soon as the order is cancelled)
## Decided by Greenfield (Enough, decide the rest)
- Q13 Which stack should the app be built with? → Decide for me (settled: Angular, Flask and SQLite)
