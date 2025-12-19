TAG=pac-prod

# docker login ghcr.io -u pacwoodson                 

# docker build -t ghcr.io/pacwoodson/immich-server:${TAG} -f ./server/Dockerfile .
# docker push ghcr.io/pacwoodson/immich-server:${TAG}

docker buildx build --platform linux/amd64 -t ghcr.io/pacwoodson/immich-server:${TAG} -f ./pac-prod-tools/Dockerfile --push .