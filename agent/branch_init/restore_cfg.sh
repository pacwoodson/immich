docker compose -f ./docker/docker-compose.dev.yml exec -T -e PGPASSWORD=postgres database psql -d immich -U postgres -c 'TRUNCATE TABLE system_metadata, "user", user_metadata, library CASCADE;'
cat ../immich/agent/branch_init/backup_cfg.sql | docker compose -f ./docker/docker-compose.dev.yml exec -T -e PGPASSWORD=postgres database psql -d immich -U postgres
