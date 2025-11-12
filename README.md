# Fraktal-PM3 Frontend

## Getting Started

To install all node dependencies
```bash
cd frontend/ && npm i && cd ../backend && npm i && cd ..
```

Run backend in docker container
```bash
docker compose up --build
```

For development in frontend or backend, use:
```bash
npm run dev
```

## MongoDB

```bash
docker run -d -p 27017:27017 --name mongodb mongo:7
```