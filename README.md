# Limited Drop System - Full-Stack Developer Test

A high-performance limited-stock product drop system designed to handle high concurrency, prevent overselling, and provide a seamless reservation-to-checkout flow.

## Architecture Overview

The system is split into two main components:
- **Backend:** Node.js, Express, TypeScript, Prisma (SQLite for local dev, easily swappable to PostgreSQL).
- **Frontend:** React, TypeScript, Vite, TailwindCSS.

### Core Features
- **Reservation System:** Users can temporarily lock stock for 5 minutes.
- **Concurrency Control:** Safely handles simultaneous requests for the same limited item.
- **Automated Expiration:** Background cron jobs automatically expire stale reservations and release stock.
- **Clean API:** Zod validation, proper status codes, and centralized error handling.
- **Observability:** Request and error logging, health and metrics endpoints.

---

## 1. Handling Race Conditions (Concurrency)

Race conditions are handled at the database level using **Optimistic Concurrency Control (OCC)**.

*   **Mechanism:** Every `Product` record has a `version` field. When a user attempts to reserve a product, the backend reads the current stock and version. During the `updateMany` operation, it explicitly filters by both `id` and the `version` it read. If another request modifies the stock first, the version increments, and the subsequent `updateMany` will affect `0` rows.
*   **Result:** The transaction safely aborts, an error is thrown, and overselling is strictly prevented without requiring slow, locking database transactions (Pessimistic Locking).
*   **Transactions:** The reservation process (deducting stock, creating reservation, logging inventory changes) is wrapped in a Prisma `$transaction` to ensure atomicity.

## 2. Schema Decisions

The database is modeled to ensure full traceability and data integrity:

*   **Product:** Holds current `stock` and OCC `version`.
*   **Reservation:** Acts as a temporary lock. It stores `userId`, `productId`, `quantity`, `expiresAt`, and a `status` (PENDING, COMPLETED, EXPIRED). 
*   **Order:** Represents a finalized purchase. It has a strict 1-to-1 relationship with a Reservation.
*   **InventoryLog:** An append-only audit trail. Every time stock goes up (reservation expired) or down (reservation created), a log is written. This is crucial for debugging stock discrepancies.
*   **User:** Standard user model to track who made which reservation.

## 3. Trade-offs Made

*   **Optimistic vs. Pessimistic Locking:** OCC was chosen over Pessimistic Locking (e.g., `SELECT ... FOR UPDATE`). OCC is much faster for read-heavy workloads but might result in more rejected requests during massive simultaneous bursts. For a "drop" scenario, OCC ensures the database doesn't lock up, even if some users get a failure and have to retry.
*   **Cron Job vs. Redis TTL:** Currently, a Node-based cron job checks for expired reservations every minute. 
    *   *Trade-off:* It's simple and requires no extra infrastructure (like Redis). 
    *   *Downside:* Expired reservations might take up to 59 seconds extra to release. For exact millisecond precision, Redis Key-Space Notifications or a dedicated queue (RabbitMQ/Bull) would be better.
*   **SQLite:** Used for simplicity and easy local setup. In production, this must be swapped to PostgreSQL.

## 4. Scaling to 10k Concurrent Users

### What would break at 10k concurrent users?
1.  **Database Connection Pool:** Prisma/SQLite would quickly run out of connections or suffer from lock contention (SQLite only allows one writer at a time).
2.  **Node.js Event Loop:** Parsing 10k simultaneous incoming JSON requests and validating them via Zod could block the single-threaded event loop.
3.  **OCC High Contention:** If 10k users try to buy 100 items, OCC will cause 9,900 of them to fail the version check, leading to a massive spike in database `update` failures and CPU usage.
4.  **Cron Job Bottleneck:** The cron job processing thousands of expired reservations synchronously would block the server.

### How to Scale It
1.  **Move to Redis for Reservations (In-Memory Queue):** 
    - Instead of directly hitting the relational database, requests should enter a Redis queue or use Redis Lua scripts to decrement stock atomically. Redis can easily handle 10k+ ops/sec.
    - PostgreSQL would only be updated asynchronously via a worker process once the reservation is secured in Redis.
2.  **Horizontal Pod Autoscaling (HPA):** Deploy the Node.js API across multiple containers (e.g., Kubernetes) behind a Load Balancer.
3.  **Database Connection Pooling:** Use PgBouncer or Prisma Accelerate to handle thousands of connections efficiently to a robust PostgreSQL cluster.
4.  **Message Brokers:** Use RabbitMQ or Kafka. When a user clicks "Reserve", they get an immediate "Pending" response while a worker processes the queue and notifies the frontend via WebSockets/SSE when their turn is up.
5.  **Caching:** Cache product details and stock status in Redis or a CDN edge to prevent 10k users from constantly querying the DB for stock.
