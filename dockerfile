FROM oven/bun

RUN apt-get update && apt-get install -y python3 python3-pip
RUN pip3 install sherlock-project
RUN curl -fsSL https://bun.sh/install | bash

WORKDIR /app

COPY . .
RUN bun install --production

RUN bun run build

CMD [ "bun", "run", "start" ]

EXPOSE 3000
