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

### Start 
```bash
# Firefly

./dev.sh up
./dev.sh deploycc package

# Frontend
/GitHub/app docker compose up -d
/GitHub/app/frontend npm i
/GitHub/app/frontend npm i https://github.com/Fraktal-PM3/fraktal-lib#5f3b11a2f5ed5a955483a277e36fe14ae1f4b719
/GitHub/app/frontend npm run start: "Whatever you want to have static"
/GitHub/app/frontend npm run "Whatever you want as dev"
```


