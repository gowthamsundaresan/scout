# Self-hosted supermemory has no official image; wrap the single-binary installer.
# bookworm (glibc) so the native onnxruntime loads — alpine/musl would force WASM embeddings.

FROM node:22-bookworm-slim

# The installer's interactive LLM-key wizard dies on /dev/tty in docker after the binary is
# already installed — keys come from container env, so tolerate the wizard and assert the binary.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends curl ca-certificates unzip \
	&& rm -rf /var/lib/apt/lists/* \
	&& (curl -fsSL https://supermemory.ai/install | bash || true) \
	&& test -x /root/.supermemory/bin/supermemory-server

ENV PATH="/root/.supermemory/bin:${PATH}"
ENV SUPERMEMORY_DATA_DIR=/data

EXPOSE 6767

CMD ["supermemory-server"]
