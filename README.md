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
# in your fraktal repo:
git pull
./dev.sh up
./dev.sh deploycc package

# to shut down
./dev.sh down

# Frontend
/GitHub/app docker compose up -d
/GitHub/app/frontend npm i
/GitHub/app/frontend npm i https://github.com/Fraktal-PM3/fraktal-lib#latestcommithash
/GitHub/app/frontend npm run start:role "role = Whatever you want to have static"
/GitHub/app/frontend npm run role "role = Whatever you want as dev"
```


