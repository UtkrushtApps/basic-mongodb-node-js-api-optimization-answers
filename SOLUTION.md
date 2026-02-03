# Solution Steps

1. Set up the MongoDB connection helper using Mongoose so the application can connect via MONGO_URI (falling back to a local Mongo instance) and export a connectDB() function to be used by the HTTP server bootstrap.

2. Design the Product model schema with fields typically needed for a catalog (name, slug, descriptions, category, price, stock, rating, numReviews, images, tags, reviews) and keep reviews as an embedded subdocument array while adding summary fields (rating, numReviews, thumbnailUrl) that can be used in list responses instead of the full reviews or large descriptions.

3. Add performance-oriented indexes to the Product schema: a compound index on { category: 1, price: 1 } for category/price filtering, an index on { isActive: 1, category: 1 } for active-catalog queries, and a text index on { name, description } to support basic text search, plus make slug unique and indexed for fast lookups.

4. Implement a lightweight in-memory cache middleware that only operates on GET requests: compute a cache key from the HTTP method and full URL, return cached JSON responses when the key is still valid, otherwise monkey-patch res.json to store the response payload with a TTL before passing it through; also export an invalidateCache() helper that clears the whole cache on write operations.

5. Create controller helpers to parse query parameters: one to handle pagination (page, limit, with sensible defaults and max limit), one to build a MongoDB filter object from query params (category, minPrice, maxPrice, tags, search using the text index), and one to safely translate a sort parameter into a whitelisted Mongo sort object.

6. Implement the getProducts controller to replace in-memory filtering with a single efficient MongoDB query: build the filter and sort from the request, use projection to return only lightweight fields needed for list views (omitting description and reviews), apply skip/limit for pagination, call .lean() for faster reads, and in parallel run countDocuments to compute total and totalPages, then respond with { data, pagination } JSON.

7. Implement the getProductById controller for product detail pages: validate the :id parameter as a Mongo ObjectId, query via findById().lean(), return 400 on invalid id, 404 when not found, and otherwise send the full product document including description and reviews.

8. Implement createProduct, updateProduct, and deleteProduct controllers with basic validation: ensure required fields (name, slug, price, category) on create, use findByIdAndUpdate with runValidators for updates and findByIdAndDelete for deletes, return appropriate HTTP status codes (201, 200, 204, 400, 404, 409) and, on any successful mutation, call invalidateCache() so cached list/detail responses don’t serve stale data.

9. Define the product routes in an Express router: mount GET / (list) with cacheMiddleware(30) and GET /:id (detail) with cacheMiddleware(60), then wire POST /, PUT /:id, and DELETE /:id to the corresponding controller functions without caching (since they mutate data and already trigger cache invalidation).

10. Configure the Express app: enable JSON body parsing, conditionally enable morgan request logging outside test environments, mount the /api/products router, add a /health endpoint, then add a 404 handler for unknown routes and a centralized error-handling middleware that logs the error and returns a JSON response with a safe error message and status code.

11. Bootstrap the HTTP server in server.js: load environment variables via dotenv, call connectDB() before starting, then create and listen on an HTTP server using the Express app on PORT (default 3000), logging a startup message or exiting the process if the database connection or server startup fails.

