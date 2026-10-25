import { createVoiceServer } from "./server";
const { server, shutdown } = createVoiceServer();
const port = Number(process.env.VOICE_PORT || 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw Error("invalid_voice_port");
server.listen(port, "0.0.0.0", () =>
  console.log("voice_service_listening", { port }),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.once(signal, () => {
    const timer = setTimeout(() => process.exit(1), 15000);
    timer.unref();
    void shutdown().finally(() => {
      clearTimeout(timer);
    });
  });
