# Fraktal-PM3 Frontend

## Getting Started

To install all node dependencies
```bash
cd frontend/ && npm i && npm install https://github.com/Fraktal-PM3/fraktal-lib
```

For development in frontend, use:
```bash
npm run dev
```

## MongoDB

```bash
docker run -d -p 27017:27017 --name mongodb mongo:7
docker exec -it mongodb mongosh
use fraktal
db.packages.find().pretty()
db.packages.deleteMany({})
```



