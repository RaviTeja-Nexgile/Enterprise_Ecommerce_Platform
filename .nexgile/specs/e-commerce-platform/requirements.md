# Requirements: Enterprise-Grade E-Commerce Platform

## Requirement 1: Customer registration and login

**User Story:** As a Customer, I want to register and sign in with my email and password, so that I can shop and keep my cart, wishlist and orders.

_Source: W1, R5, BR3, N1_

### Acceptance Criteria

1. WHEN a Guest shopper submits the registration form with a first name, last name, email, password and phone THE SYSTEM SHALL create an active Customer account with a hashed password and sign them in.
2. IF the email a Guest shopper registers with already belongs to an account THEN THE SYSTEM SHALL keep the form open and show the message "An account with this email already exists".
3. IF the password a Guest shopper enters is shorter than 8 characters or has no uppercase letter, no lowercase letter and no digit THEN THE SYSTEM SHALL keep the form open and show the message "Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a digit".
4. WHEN a Customer signs in with a registered email and its password THE SYSTEM SHALL issue an access token and a refresh token and open the storefront home page.
5. IF a Customer signs in with a wrong password or an unknown email THEN THE SYSTEM SHALL keep the sign-in form open and show the message "Invalid email or password".
6. WHEN a Customer's access token expires THE SYSTEM SHALL renew it with the refresh token and keep the Customer signed in.
7. WHEN a Customer signs out THE SYSTEM SHALL revoke the refresh token and open the sign-in page.
8. WHEN a Customer requests a password reset for their email THE SYSTEM SHALL send a reset link to the local development mail inbox and show the message "If the email is registered, a reset link has been sent".
9. WHEN a Customer opens a reset link that has not expired and has not been used and submits a new password THE SYSTEM SHALL set the new password, mark the link used and open the sign-in page.
10. IF a reset link has expired or has already been used THEN THE SYSTEM SHALL show the message "This reset link is no longer valid" and keep the sign-in page open.
11. WHEN a person uses the registration, sign-in or password reset form THE SYSTEM SHALL label every field with a visible label, mark each field that fails validation with aria-invalid and link its error text to the field with aria-describedby, so the form meets WCAG 2.2 AA.

## Requirement 2: Roles and access control

**User Story:** As a Super Admin, I want each person to reach only the screens and data their role allows, so that customer data and admin operations stay protected.

_Source: R1, R2, R3, R4, R5, BR3, F12, N1_

### Acceptance Criteria

1. WHEN a Super Admin signs in THE SYSTEM SHALL open the admin dashboard overview.
2. WHEN an Admin signs in THE SYSTEM SHALL open the admin dashboard overview.
3. WHEN an Inventory Manager signs in THE SYSTEM SHALL open the admin inventory screen.
4. WHEN an Order Manager signs in THE SYSTEM SHALL open the admin orders screen.
5. WHEN a Customer signs in THE SYSTEM SHALL open the storefront home page.
6. WHILE a Customer is signed in, WHEN they open an admin address THE SYSTEM SHALL show the message "You do not have access to this page" and keep them signed in.
7. IF a signed-in person calls an admin API endpoint their role does not allow THEN THE SYSTEM SHALL answer with status 403 and the message "You do not have permission to do this".
8. IF a Customer asks for another Customer's order, address or profile THEN THE SYSTEM SHALL answer with status 403 and the message "You do not have permission to do this".
9. WHEN a Super Admin opens the admin users screen THE SYSTEM SHALL list every admin account with its role and active status.
10. WHEN a Super Admin changes an admin account's role or deactivates it THE SYSTEM SHALL save the change, write an audit log entry and apply the new access at that account's next request.
11. WHEN a person uses the sign-in page or the admin users screen with only the keyboard THE SYSTEM SHALL let them reach and operate every link, button, field and table control with Tab, Shift+Tab, Enter and Escape, and show a visible focus outline of at least 2 pixels on the focused control, so the screens meet WCAG 2.2 AA.

## Requirement 3: Home page

**User Story:** As a Guest shopper, I want a home page that shows featured collections, trending and best-selling products and offers, so that I can find something to buy quickly.

_Source: W2, R6, N3_

### Acceptance Criteria

1. WHEN a Guest shopper opens `/` THE SYSTEM SHALL show the home page with a hero banner, featured categories, trending products, best-selling products, new arrivals, promotional offers, customer testimonials, a newsletter form and a footer.
2. WHEN the home page loads THE SYSTEM SHALL fill every product section from the products API, showing at most 8 products in each section.
3. WHEN a Guest shopper clicks a featured category THE SYSTEM SHALL open the product catalog filtered to that category.
4. WHEN a Guest shopper clicks a product card THE SYSTEM SHALL open that product's detail page.
5. WHEN a Guest shopper submits the newsletter form with a valid email THE SYSTEM SHALL show the message "Thanks for subscribing".
6. IF the newsletter form is submitted with an empty or invalid email THEN THE SYSTEM SHALL keep the form open and show the message "Enter a valid email address".
7. WHEN the home page is loading THE SYSTEM SHALL show skeleton placeholders in place of each product section.

## Requirement 4: Product catalog, search and filters

**User Story:** As a Guest shopper, I want to search and filter the catalog, so that I can find the product I want.

_Source: W2, R6, N3_

### Acceptance Criteria

1. WHEN a Guest shopper opens `/products` THE SYSTEM SHALL show a grid of published products with a search bar, a filter panel, a sort control, a result count and pagination of 12 products per page.
2. WHEN a Guest shopper types at least 2 characters in the search bar THE SYSTEM SHALL show up to 6 matching product suggestions within 300 milliseconds of the last keystroke.
3. WHEN a Guest shopper submits a search THE SYSTEM SHALL show only products whose name, SKU or description contains the search text and show the count of matching products.
4. WHEN a Guest shopper selects a category, a brand, a price range, an availability option or a minimum rating THE SYSTEM SHALL show only products that match every selected filter.
5. WHEN a Guest shopper chooses a sort option THE SYSTEM SHALL order the results by price low to high, price high to low, newest, most popular or highest rating.
6. WHEN a Guest shopper clicks "Clear all filters" THE SYSTEM SHALL remove every filter and show the full published catalog.
7. IF no product matches the search and filters THEN THE SYSTEM SHALL show the message "No products match your search" with a "Clear all filters" button.
8. WHEN a Guest shopper opens page 2 of the results THE SYSTEM SHALL show the next 12 products and keep the selected filters.
9. WHEN a Guest shopper opens the catalog on a phone THE SYSTEM SHALL show the filters in a panel that opens from a "Filters" button.

## Requirement 5: Product details

**User Story:** As a Guest shopper, I want a product page with images, variants, stock and reviews, so that I can decide whether to buy.

_Source: W2, R6, N3_

### Acceptance Criteria

1. WHEN a Guest shopper opens a product's detail page THE SYSTEM SHALL show its image gallery, name, SKU, regular price, discounted price and discount percentage, stock availability, description, specifications, variants, quantity selector, "Add to cart" and "Add to wishlist" buttons, rating summary, approved reviews, related products and recently viewed products.
2. WHEN a Guest shopper clicks a thumbnail in the gallery THE SYSTEM SHALL show that image as the main image.
3. WHEN a Guest shopper clicks the main image THE SYSTEM SHALL show the image enlarged with zoom.
4. WHEN a Guest shopper selects a variant THE SYSTEM SHALL show that variant's SKU, price and stock availability.
5. IF the selected product or variant has no available stock THEN THE SYSTEM SHALL disable "Add to cart" and show the message "Out of stock".
6. WHEN a Guest shopper clicks "Add to wishlist" while signed out THE SYSTEM SHALL open the sign-in page.
7. WHEN a Guest shopper opens a product detail page THE SYSTEM SHALL show it within 2 seconds on a local machine.
8. WHEN a Guest shopper opens a product detail page THE SYSTEM SHALL add the product to their recently viewed products, showing at most 6 of them.

## Requirement 6: Shopping cart

**User Story:** As a Customer, I want a cart that keeps my items and shows trusted totals, so that I know what I will pay.

_Source: W3, BR1, BR2, BR6_

### Acceptance Criteria

1. WHEN a Customer clicks "Add to cart" on a product THE SYSTEM SHALL add the product and quantity to their cart, open the cart drawer and show the message "Added to cart".
2. WHEN a Customer changes an item's quantity in the cart THE SYSTEM SHALL save the new quantity and recalculate the subtotal, discount, estimated tax and order total on the backend.
3. WHEN a Customer removes an item from the cart THE SYSTEM SHALL remove it and recalculate the totals on the backend.
4. IF a Customer sets a quantity above the available stock THEN THE SYSTEM SHALL keep the quantity at the available stock and show the message "Only N left in stock".
5. IF a product in the cart becomes out of stock THEN THE SYSTEM SHALL mark the item "Out of stock" and exclude it from the order total.
6. WHEN a Customer signs in THE SYSTEM SHALL restore the cart they saved before signing out.
7. WHEN a Guest shopper adds an item to the cart and then signs in THE SYSTEM SHALL merge the guest cart into the Customer's cart.
8. WHEN the cart holds items THE SYSTEM SHALL show the item count on the cart icon in the navigation bar.
9. IF a request to change the cart sends a price different from the stored price THEN THE SYSTEM SHALL ignore the sent price and use the stored price in the totals.

## Requirement 7: Wishlist

**User Story:** As a Customer, I want to save products for later, so that I can buy them when I am ready.

_Source: W2, R5_

### Acceptance Criteria

1. WHEN a signed-in Customer clicks "Add to wishlist" on a product THE SYSTEM SHALL add the product to their wishlist and show the message "Added to wishlist".
2. IF a Customer adds a product that is already in their wishlist THEN THE SYSTEM SHALL keep one entry and show the message "Already in your wishlist".
3. WHEN a Customer opens the wishlist page THE SYSTEM SHALL list their saved products with price, stock availability and an "Add to cart" button.
4. WHEN a Customer clicks "Move to cart" on a wishlist item THE SYSTEM SHALL add the item to the cart and remove it from the wishlist.
5. WHEN a Customer clicks "Remove" on a wishlist item THE SYSTEM SHALL remove it from the wishlist.
6. IF a wishlist product is archived or out of stock THEN THE SYSTEM SHALL show it marked "Unavailable" with "Add to cart" disabled.
7. WHEN a Customer signs in again THE SYSTEM SHALL show the wishlist they saved before signing out.

## Requirement 8: Checkout and mock payment

**User Story:** As a Customer, I want a clear multi-step checkout with a mock card payment, so that I can place an order and see it confirmed.

_Source: W3, BR1, BR2, BR4, BR5, BR6, N2, N4, EV1_

### Acceptance Criteria

1. WHEN a Customer clicks "Checkout" with items in the cart THE SYSTEM SHALL open a checkout with the steps Customer information, Shipping address, Billing address, Delivery method, Order review, Payment and Confirmation.
2. WHEN a Customer saves a shipping or billing address THE SYSTEM SHALL keep it in their address book and let them pick a saved address on later checkouts.
3. WHEN a Customer applies a coupon code THE SYSTEM SHALL validate it on the backend and show the discount in the order summary.
4. IF a coupon is expired, over its usage limit, below its minimum order value or restricted from the cart's products THEN THE SYSTEM SHALL refuse it and show the message "This coupon cannot be used for this order".
5. WHEN a Customer reaches the order review step THE SYSTEM SHALL show the items, subtotal, coupon discount, shipping fee, estimated tax and order total, all calculated on the backend.
6. WHEN a Customer selects a delivery method THE SYSTEM SHALL add that method's shipping fee to the order total.
7. WHEN a Customer confirms the order THE SYSTEM SHALL reserve the stock for each item in one transaction, create the order with a unique order number and status Pending, and take the mock credit card payment.
8. IF any item's available stock is less than the requested quantity at confirmation THEN THE SYSTEM SHALL create no order, reserve no stock and show the message "Some items are no longer available" with the affected items.
9. WHEN the mock payment succeeds THE SYSTEM SHALL set the order to Confirmed, empty the cart and open the order confirmation page with the order number.
10. IF the mock payment fails or is cancelled THEN THE SYSTEM SHALL release the reserved stock, keep the order in Pending with payment status Failed or Cancelled, and show the message "Payment was not completed" with a "Try again" button.
11. WHEN a Customer completes checkout THE SYSTEM SHALL show the confirmation within 3 seconds on a local machine.
12. WHEN a Customer pays THE SYSTEM SHALL accept only a card number, expiry date and security code in the mock payment form and store none of them.

## Requirement 9: Customer account and order history

**User Story:** As a Customer, I want my account area with my details, addresses, orders and reviews, so that I can manage my shopping.

_Source: W3, R5, BR7, BR9, BR10, BR11, EV2_

### Acceptance Criteria

1. WHEN a Customer opens `/account` THE SYSTEM SHALL show an overview with their name, email, order count, total spent and the status of their latest order.
2. WHEN a Customer edits their personal information THE SYSTEM SHALL save the first name, last name and phone and show the message "Profile updated".
3. WHEN a Customer changes their password with the correct current password and a valid new password THE SYSTEM SHALL save the new password and show the message "Password changed".
4. WHEN a Customer opens the address book THE SYSTEM SHALL list their addresses and let them add, edit, delete and set a default address.
5. WHEN a Customer opens order history THE SYSTEM SHALL list their orders newest first with order number, date, status, payment status and total, 10 per page.
6. WHEN a Customer opens an order THE SYSTEM SHALL show its items, totals, shipping and billing addresses, delivery method, payment status and status history.
7. WHEN a Customer cancels an order whose status is Pending, Confirmed or Processing THE SYSTEM SHALL set it to Cancelled, release its reserved stock and record a full mock refund of the amount paid, including shipping and tax, at once.
8. IF a Customer tries to cancel an order whose status is Shipped, Delivered, Cancelled or Refunded THEN THE SYSTEM SHALL keep the order unchanged and show the message "This order can no longer be cancelled".
9. WHEN a Customer opens the reviews section THE SYSTEM SHALL list their reviews with each review's status Pending, Approved or Rejected.

## Requirement 10: Reviews and ratings

**User Story:** As a Customer, I want to rate and review products I bought, so that other shoppers can learn from my experience.

_Source: W7, BR8, R5_

### Acceptance Criteria

1. WHEN a signed-in Customer submits a rating from 1 to 5 and a comment of at least 10 characters on a product THE SYSTEM SHALL save the review with status Pending and show the message "Your review is awaiting approval".
2. WHEN a Customer reviews a product they have an order for THE SYSTEM SHALL mark the review as a verified purchase.
3. IF a Customer submits a review without a rating or with a comment shorter than 10 characters THEN THE SYSTEM SHALL keep the form open and show the message "Choose a rating and write at least 10 characters".
4. WHEN a Customer opens a product page THE SYSTEM SHALL show only approved reviews, the average rating to one decimal place and the count of reviews for each rating from 1 to 5.
5. WHEN an Admin approves a review THE SYSTEM SHALL show it on the product page and include it in the product's average rating.
6. IF an Admin rejects a review THEN THE SYSTEM SHALL never show it on the product page.

## Requirement 11: Admin dashboard overview

**User Story:** As an Admin, I want an overview of revenue, orders, customers and stock, so that I can see how the business is doing.

_Source: W9, R2, R1, RP1_

### Acceptance Criteria

1. WHEN an Admin opens the admin dashboard THE SYSTEM SHALL show KPI cards for total revenue, total orders, total customers, total products, average order value, pending orders, low-stock products and out-of-stock products, all calculated from the database.
2. WHEN an Admin picks a date range THE SYSTEM SHALL recalculate every KPI card and chart for that range.
3. WHEN an Admin opens the dashboard THE SYSTEM SHALL show a revenue trend chart, a top-selling products list, a best-performing categories list, the 5 most recent orders and the 5 most recent customer registrations.
4. WHEN an Admin switches the revenue chart between daily, weekly, monthly, quarterly and yearly THE SYSTEM SHALL redraw the chart for that grouping.
5. WHEN an Admin opens the dashboard THE SYSTEM SHALL show the revenue of the selected range beside the revenue of the range before it, with the change as a percentage.

## Requirement 12: Admin product management

**User Story:** As an Admin, I want to create, edit, publish and archive products with images, prices and variants, so that the catalog stays current.

_Source: W4, R2, R1, F9_

### Acceptance Criteria

1. WHEN an Admin opens product management THE SYSTEM SHALL show a searchable, filterable table of products with pagination of 20 rows, showing name, SKU, category, price, stock and status.
2. WHEN an Admin creates a product with a name, SKU, category, brand, regular price, description and at least one image THE SYSTEM SHALL save it with status Draft and show it in the table.
3. IF an Admin saves a product with a SKU that another product or variant already uses THEN THE SYSTEM SHALL keep the form open and show the message "This SKU is already in use".
4. IF an Admin saves a product without a name, SKU, category or regular price THEN THE SYSTEM SHALL keep the form open and show an error message beside each missing field.
5. WHEN an Admin uploads a product image that is a JPEG or PNG of 5 MB or less THE SYSTEM SHALL attach it to the product and show it in the product's gallery.
6. IF an Admin uploads a file that is not a JPEG or PNG or is larger than 5 MB THEN THE SYSTEM SHALL refuse it and show the message "Images must be JPEG or PNG and 5 MB or less".
7. WHEN an Admin adds a variant with its own SKU, price and stock THE SYSTEM SHALL save it under the product and track its stock separately.
8. WHEN an Admin publishes a product THE SYSTEM SHALL show it in the storefront catalog; WHEN an Admin unpublishes it THE SYSTEM SHALL hide it from the storefront.
9. WHEN an Admin selects products and runs a bulk action to publish, unpublish or archive THE SYSTEM SHALL apply it to every selected product.
10. WHEN an Admin archives a product THE SYSTEM SHALL keep its order history and hide it from the storefront.

## Requirement 13: Admin category and brand management

**User Story:** As an Admin, I want to organize products into categories and brands, so that shoppers can browse by them.

_Source: W4, R2, R1_

### Acceptance Criteria

1. WHEN an Admin opens category management THE SYSTEM SHALL show the categories as a tree with each category's name, status, product count and order.
2. WHEN an Admin creates a category with a name, description and optional parent category THE SYSTEM SHALL save it and show it in the tree under its parent.
3. WHEN an Admin changes a category's order or status THE SYSTEM SHALL save the change and show the categories in the new order.
4. IF an Admin deletes a category that contains products THEN THE SYSTEM SHALL refuse the deletion and show the message "Move or archive this category's products first".
5. WHEN an Admin deletes a category with no products THE SYSTEM SHALL remove it and show the message "Category deleted".
6. WHEN an Admin creates or edits a brand with a name and description THE SYSTEM SHALL save it and offer it in the product form's brand list.

## Requirement 14: Admin customer management

**User Story:** As an Admin, I want to find customers and see their orders and spending, so that I can help them.

_Source: R2, R1, F13_

### Acceptance Criteria

1. WHEN an Admin opens customer management THE SYSTEM SHALL show a searchable table of Customers with name, email, registration date, account status and total spent, 20 per page.
2. WHEN an Admin opens a customer's profile THE SYSTEM SHALL show their details, addresses, order history and spending summary.
3. WHEN an Admin deactivates a customer account THE SYSTEM SHALL block that customer's next sign-in with the message "This account is inactive" and write an audit log entry.
4. WHEN an Admin reactivates a customer account THE SYSTEM SHALL let that customer sign in again.
5. IF a person whose role is not Admin or Super Admin calls a customer management endpoint THEN THE SYSTEM SHALL answer with status 403.

## Requirement 15: Admin order management

**User Story:** As an Order Manager, I want to find orders, move them through their statuses, refund them and export them, so that orders are fulfilled correctly.

_Source: W5, R4, R2, BR7, BR9, BR10, BR11_

### Acceptance Criteria

1. WHEN an Order Manager opens order management THE SYSTEM SHALL show a table of orders with order number, customer, date, status, payment status and total, 20 per page, with search by order number and filters by status and date.
2. WHEN an Order Manager opens an order THE SYSTEM SHALL show its items, totals, customer, shipping and billing addresses, payment and full status history.
3. WHEN an Order Manager moves an order to the next status in the order Pending, Confirmed, Processing, Shipped, Delivered THE SYSTEM SHALL save the new status, add a status history entry and write an audit log entry.
4. IF an Order Manager sets a status that does not follow the order's current status THEN THE SYSTEM SHALL keep the order unchanged and show the message "This status change is not allowed".
5. WHEN an Order Manager cancels an order that has not shipped THE SYSTEM SHALL set it to Cancelled, release its reserved stock and record a full mock refund at once.
6. WHEN an Order Manager refunds a delivered order THE SYSTEM SHALL set the order to Refunded and record a full mock refund.
7. WHEN an Order Manager clicks "Print invoice" on an order THE SYSTEM SHALL open a printable invoice with the order number, customer, items, totals and date.
8. WHEN an Order Manager clicks "Export CSV" THE SYSTEM SHALL download a CSV file of the orders that match the current search and filters.

## Requirement 16: Admin inventory management

**User Story:** As an Inventory Manager, I want to see stock, adjust it and see its history, so that we never oversell.

_Source: W6, R3, BR2, BR6, EV3, RP3_

### Acceptance Criteria

1. WHEN an Inventory Manager opens inventory THE SYSTEM SHALL show every product and variant with its stock quantity, reserved stock, available stock and low-stock threshold, with filters for low stock and out of stock.
2. WHEN an Inventory Manager adjusts a stock quantity with a reason THE SYSTEM SHALL save the new quantity, record an inventory movement with the change, reason, date and the person who made it, and write an audit log entry.
3. IF an adjustment would make the stock quantity negative THEN THE SYSTEM SHALL refuse it and show the message "Stock cannot go below zero".
4. WHEN an item's available stock falls to or below its low-stock threshold THE SYSTEM SHALL list it under low-stock alerts.
5. WHEN an Inventory Manager opens an item's movement history THE SYSTEM SHALL list its movements newest first with the change, reason, date and person.
6. WHEN two orders are placed for the last unit of a product at the same time THE SYSTEM SHALL confirm only one order and leave the other with the message "Some items are no longer available".

## Requirement 17: Admin coupon management

**User Story:** As an Admin, I want to create and track coupons, so that promotions apply only when they are valid.

_Source: W8, R2, BR4, EV4_

### Acceptance Criteria

1. WHEN an Admin creates a coupon with a code, a type of percentage or fixed amount, a value, a minimum order value, a maximum discount, an expiry date, a usage limit and a per-customer limit THE SYSTEM SHALL save it as inactive.
2. WHEN an Admin activates a coupon THE SYSTEM SHALL make it usable at checkout until its expiry date.
3. WHEN a Customer uses a coupon on an order THE SYSTEM SHALL record a redemption with the coupon, customer, order and date.
4. WHEN a coupon passes its expiry date THE SYSTEM SHALL refuse it at checkout and show it as Expired in the coupon list.
5. WHEN an Admin opens a coupon THE SYSTEM SHALL show its redemption count and the orders it was used on.
6. IF an Admin saves a coupon code that another coupon already uses THEN THE SYSTEM SHALL keep the form open and show the message "This coupon code already exists".

## Requirement 18: Admin reports

**User Story:** As an Admin, I want revenue, product, category and inventory reports with CSV export, so that I can review the business.

_Source: W9, R2, R1, RP1, RP2, RP3_

### Acceptance Criteria

1. WHEN an Admin opens reports and picks a date range and a report of revenue, orders, product performance, category performance, customer acquisition or inventory THE SYSTEM SHALL show charts and tables calculated from the database for that range.
2. WHEN an Admin picks the revenue report THE SYSTEM SHALL show revenue by day, week, month, quarter or year, including the latest order placed.
3. WHEN an Admin picks the inventory report THE SYSTEM SHALL show the low-stock and out-of-stock items as of the latest movement.
4. WHEN an Admin clicks "Export CSV" on a report THE SYSTEM SHALL download a CSV file of the report's rows.
5. WHEN an Admin clicks "Print" on a report THE SYSTEM SHALL open a printable version of the report.
6. IF the selected range holds no orders THEN THE SYSTEM SHALL show the message "No data in this range" in place of the charts.

## Requirement 19: Admin review moderation

**User Story:** As an Admin, I want to approve or reject reviews, so that only genuine reviews appear on the storefront.

_Source: W7, R2, BR8_

### Acceptance Criteria

1. WHEN an Admin opens the review queue THE SYSTEM SHALL list the reviews with status Pending, newest first, with the product, customer, rating and comment.
2. WHEN an Admin approves a review THE SYSTEM SHALL set it to Approved, show it on the product page and write an audit log entry.
3. WHEN an Admin rejects a review THE SYSTEM SHALL set it to Rejected and never show it on the product page.
4. WHEN an Admin filters the review queue by status THE SYSTEM SHALL show only the reviews with that status.

## Requirement 20: Audit trail

**User Story:** As a Super Admin, I want a log of admin changes, so that I can see who changed what and when.

_Source: F14, R1_

### Acceptance Criteria

1. WHEN an Admin or Super Admin changes a product, category, order status, stock quantity, coupon, review status or admin account THE SYSTEM SHALL write an audit log entry with the person, the action, the record type, the record id, the details and the date.
2. WHEN a Super Admin opens the audit log THE SYSTEM SHALL list the entries newest first with the person, action, record and date, 20 per page.
3. WHEN a Super Admin filters the audit log by person, record type or date range THE SYSTEM SHALL show only the matching entries.

## Requirement 21: Accessibility and responsiveness

**User Story:** As a shopper or an admin, I want the app to work with a keyboard and on my phone, so that I can use it anywhere.

_Source: N1, F15_

### Acceptance Criteria

1. WHEN a person uses only the keyboard THE SYSTEM SHALL let them reach and operate every navigation link, button, form field, dialog and table control with Tab, Shift+Tab, Enter and Escape.
2. WHEN a dialog or the cart drawer opens THE SYSTEM SHALL move focus into it and return focus to the control that opened it when it closes.
3. WHEN a form field fails validation THE SYSTEM SHALL show the error text beside the field and link it to the field for screen readers.
4. WHEN a person views any screen at a width of 375 pixels THE SYSTEM SHALL show every control without horizontal scrolling.
5. WHEN a person views any screen at a width of 1440 pixels THE SYSTEM SHALL show the desktop layout with the full navigation.
6. WHEN a person views any screen THE SYSTEM SHALL show text and controls with a contrast ratio of at least 4.5 to 1 for normal text and 3 to 1 for large text and interface borders.
7. WHEN a person views any screen THE SYSTEM SHALL give every image an alternative text, every form field a visible label and every page a single main heading, and SHALL show a visible focus outline of at least 2 pixels on the focused control, so the screen meets WCAG 2.2 AA.
8. WHEN a person uses any screen with only the keyboard THE SYSTEM SHALL let them reach and operate every link, button, field, dialog and table control with Tab, Shift+Tab, Enter and Escape, and SHALL move focus into a dialog when it opens and back to the control that opened it when it closes.

## Requirement 22: Sample data and demo accounts

**User Story:** As the person running the app locally, I want sample data and demo accounts, so that I can try every workflow at once.

_Source: F3, M1, F10_

### Acceptance Criteria

1. WHEN the database is seeded THE SYSTEM SHALL hold at least 8 categories, at least 30 published products with images, multiple brands, product variants, sample Customers, sample orders in different statuses, sample reviews, sample coupons and inventory movements.
2. WHEN the database is seeded THE SYSTEM SHALL create the demo accounts admin@example.com with password Admin@12345 as Super Admin and customer@example.com with password Customer@12345 as Customer, with hashed passwords.
3. WHEN a person signs in with a demo account THE SYSTEM SHALL open that account's role's first screen.
4. WHEN the seed script runs on a database that already holds data THE SYSTEM SHALL leave the existing data unchanged.

## Requirement 23: Error handling and feedback

**User Story:** As a person using the app, I want clear messages when something fails, so that I know what to do next.

_Source: F16, N1_

### Acceptance Criteria

1. WHEN an API request fails THE SYSTEM SHALL show a toast with the message the API returned and keep the screen usable.
2. WHEN a screen is loading data THE SYSTEM SHALL show a loading skeleton in place of the content.
3. WHEN a list or table holds no records THE SYSTEM SHALL show an empty state with a message and the action that creates the first record.
4. WHEN an action succeeds THE SYSTEM SHALL show a success toast with the message for that action.
5. IF an API request fails with status 500 THEN THE SYSTEM SHALL show the message "Something went wrong. Please try again." and never show a stack trace.
6. WHEN a signed-in person's refresh token is revoked or expired THE SYSTEM SHALL open the sign-in page with the message "Your session has expired. Please sign in again".
7. WHEN a toast, error message or empty state appears THE SYSTEM SHALL announce it to screen readers with role="status" for success messages and role="alert" for errors, and SHALL keep the message visible for at least 5 seconds, so the feedback meets WCAG 2.2 AA.

## Later releases

- S1 No cloud hosting or production deployment.
- S2 No dependency on external cloud infrastructure.

## Assumptions

- The store sells physical goods in one currency, US dollars, with prices stored in integer cents.
- There is one business with one admin dashboard; customers do not belong to organisations.
- Estimated tax at checkout is 8% of the discounted subtotal after the coupon discount, shown as an estimate.
- Shipping fees are Standard 5.00 USD, Express 12.00 USD and Next day 25.00 USD; Standard is free on orders of 100.00 USD or more.
- A cancelled order is refunded in full, including shipping and tax, and the mock refund is recorded immediately.
- The mock payment gateway simulates credit card payments only and accepts any card number of 16 digits with a future expiry date.
- Product reviews are written by signed-in Customers only, one review per product per Customer.
- The newsletter form stores the email in the local database.
- The local development mail inbox is Mailpit, started by the dev command.
- Recently viewed products are kept in the browser's local storage.
- The admin dashboard is served under `/admin` in the same Angular app, and the API is served under `/api/v1`.
- The app is used on desktop and phone browsers and does not work offline.
