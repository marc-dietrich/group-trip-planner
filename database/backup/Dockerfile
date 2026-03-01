FROM alpine:3.20

RUN apk add --no-cache \
    bash \
    coreutils \
    gnupg \
    gzip \
    lftp \
    openssh-client \
    postgresql-client \
    rsync \
    tzdata

WORKDIR /app

COPY entrypoint.sh /app/entrypoint.sh
COPY backup_job.sh /app/backup_job.sh
COPY sync_remote.sh /app/sync_remote.sh

RUN chmod +x /app/entrypoint.sh /app/backup_job.sh /app/sync_remote.sh

ENTRYPOINT ["/app/entrypoint.sh"]
