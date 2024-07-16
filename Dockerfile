FROM node:18-buster

RUN apt-get update && apt-get install -y --fix-missing --no-install-recommends \
    build-essential \
    curl \
    git-core \
    iputils-ping \
    pkg-config \
    rsync \
    software-properties-common \
    unzip \
    wget
WORKDIR /app

COPY "docker/entrypoint.sh" ./

COPY package*.json ./
RUN npm install
RUN npm run build

COPY . ./

VOLUME [ "/app/config.json", "/app/database", "/app/db.json" ]

CMD ["sh", "entrypoint.sh"]
