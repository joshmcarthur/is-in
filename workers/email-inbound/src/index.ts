import { type InboundContext, runDestinationChecks, runMessageChecks } from "./checks.js";
import { deliverNative } from "./deliver.js";

export default {
  async email(message: ForwardableEmailMessage, env: Env, _ctx: ExecutionContext): Promise<void> {
    const ctx: InboundContext = {
      message,
      env,
      recipient: message.to.trim().toLowerCase(),
      destinations: [],
    };

    const result = await runMessageChecks(ctx);
    if (result.action === "drop") {
      console.warn("email_inbound_drop", { reason: result.reason, ...result.detail });
      return;
    }

    for (const destination of ctx.destinations) {
      const check = runDestinationChecks(ctx, destination);
      if (check.action === "drop") {
        console.warn("email_inbound_drop", { reason: check.reason, ...check.detail });
        continue;
      }
      const delivery = await deliverNative(message, destination);
      if (!delivery.ok) {
        console.error("email_inbound_delivery_failed", {
          subdomain: ctx.subdomain,
          destination,
          error: delivery.error,
        });
      }
    }
  },
} satisfies ExportedHandler<Env>;
