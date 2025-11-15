Analytics Microservices System
A lightweight, production-ready analytics pipeline built using Node.js, Redis Streams, and PostgreSQL, designed for high-speed event ingestion, background processing, and fast reporting.
This repository contains three microservices, Dockerized and orchestrated with Docker Compose:
ServiceDescriptioningestion-serviceReceives events via REST (POST /event) and pushes them into Redis Streams for fast, non-blocking ingestion.processor-serviceBackground worker that consumes Redis Stream events, writes raw data to PostgreSQL, and maintains daily aggregated tables.reporting-serviceExposes a reporting API (GET /stats) to retrieve aggregated analytics such as views, unique users, and top paths.

🚀 Features
✅ High-throughput event ingestion


POST /event accepts analytics events


Validates input using Joi


Writes to Redis Streams instantly (no DB latency)


✅ Reliable background processing


Redis Consumer Groups


Worker consumes batches of events


Writes:


Raw events


Daily aggregates


Daily path views


Daily unique users




✅ Fast reporting API


/stats?site_id=X&date=YYYY-MM-DD


Returns:


total views


unique users


top paths




✅ Fully Dockerized


Redis


PostgreSQL


All microservices


Automatic DB migrations via SQL file



📁 Project Structure
my-analytics/
├── ingestion-service/
├── processor-service/
├── reporting-service/
├── migrations/
│   └── init.sql
├── docker-compose.yml
├── README.md
└── .env.example


🛠 Technologies Used


Node.js (Express)


Redis Streams


PostgreSQL


Docker + Docker Compose


Joi validation


pg (PostgreSQL driver)



⚙️ Setup & Installation
1️⃣ Clone the repository
git clone <your-repo-url>
cd my-analytics

2️⃣ Copy environment variables
cp .env.example .env

3️⃣ Start all services
docker-compose up --build

4️⃣ Verify services are running


Ingestion API → http://localhost:3000/health


Reporting API → http://localhost:3001/health


Redis → localhost:6379


Postgres → localhost:5432



📩 API Usage

1. Ingest Event
POST /event (ingestion-service)
URL: http://localhost:3000/event
Body:
{
  "site_id": "site-abc-123",
  "event_type": "page_view",
  "path": "/pricing",
  "user_id": "user-xyz-789",
  "timestamp": "2025-11-12T19:30:01Z"
}

Response:
{
  "success": true,
  "queued_id": "169238492838-0"
}


2. Get Daily Stats
GET /stats (reporting-service)
URL:
http://localhost:3001/stats?site_id=site-abc-123&date=2025-11-12

Response:
{
  "site_id": "site-abc-123",
  "date": "2025-11-12",
  "total_views": 42,
  "unique_users": 7,
  "top_paths": [
    { "path": "/pricing", "views": 20 },
    { "path": "/blog/123", "views": 10 }
  ]
}


🗄 Database Schema
Automatically created from:
migrations/init.sql
Tables:


events


daily_aggregates


daily_path_views


daily_unique_users


Indexes included for performance.

🔧 Development
Restart a single service
docker-compose restart ingestion

View logs
docker-compose logs -f processor

Reset database
docker-compose down -v
docker-compose up --build


📌 Notes


processor-service handles retries automatically via Redis consumer groups.


Aggregations happen per day (UTC).


For production:


Add metrics, dead-letter handling, and request limits


Scale ingestion-service and processor-service horizontally


Replace Redis with Kafka if needed for massive throughput





🧪 Example Event Flow
Client → POST /event
        → ingestion-service → Redis Stream → processor-service
               → PostgreSQL (raw + aggregates)
                      → reporting-service GET /stats


