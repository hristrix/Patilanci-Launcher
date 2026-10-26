package com.hristrix.skin;

import com.google.gson.Gson;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.regex.Pattern;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.message.v1.ClientReceiveMessageEvents;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayConnectionEvents;
import net.minecraft.client.MinecraftClient;
import net.minecraft.text.Text;

/** No request JVM property means no behavior, including premium launches. */
public final class SkinCompanion implements ClientModInitializer {
    private record Request(String player, String server, String command) {}
    private static final Pattern COMMAND = Pattern.compile(
        "skin set (?:mojang [A-Za-z0-9_]{3,16}|ely\\.by [A-Za-z0-9_]{3,16}|web (?:classic|slim) \"https://[^\\s\"\\\\\\p{Cntrl}]+\")");
    private Request request;
    private final SkinApplication application = new SkinApplication();

    @Override
    public void onInitializeClient() {
        String encoded = System.getProperty("patilanci.skin.request");
        if (encoded == null || encoded.length() > 2048) return;
        try {
            request = new Gson().fromJson(new String(Base64.getUrlDecoder().decode(encoded), StandardCharsets.UTF_8), Request.class);
            if (request == null || request.player == null || request.server == null || request.command == null
                || !request.player.matches("[A-Za-z0-9_]{3,16}")
                || request.command.length() > 255 || !COMMAND.matcher(request.command).matches()) return;
        } catch (RuntimeException ignored) { return; }

        ClientPlayConnectionEvents.JOIN.register((handler, sender, client) -> {
            application.join(matches(client));
        });
        ClientPlayConnectionEvents.DISCONNECT.register((handler, client) -> application.disconnect());
        ClientReceiveMessageEvents.GAME.register((message, overlay) -> {
            MinecraftClient client = MinecraftClient.getInstance();
            if (!matches(client)) return;
            // Server system messages only, never player chat or password contents.
            application.message(message.getString());
        });
        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            var handler = client.getNetworkHandler();
            boolean commandAllowed = handler != null && handler.getCommandDispatcher().getRoot().getChild("skin") != null;
            SkinApplication.Action action = application.tick(matches(client) && client.player != null, commandAllowed);
            if (action == SkinApplication.Action.UNAVAILABLE) {
                notice(client, "Automatic skin unavailable: SkinRestorer's /skin command is not allowed. Use the launcher's Copy skin command after login.");
            } else if (action == SkinApplication.Action.APPLY || action == SkinApplication.Action.RETRY) {
                handler.sendChatCommand(request.command);
                notice(client, action == SkinApplication.Action.RETRY ? "Reapplying your saved skin after login..." : "Applying your saved launcher skin...");
            }
        });
    }

    private boolean matches(MinecraftClient client) {
        if (client.getNetworkHandler() == null || client.isInSingleplayer()) return false;
        var server = client.getCurrentServerEntry();
        return server != null && SkinApplication.matches(server.address, client.getSession().getUsername(), request.server, request.player);
    }

    private static void notice(MinecraftClient client, String text) {
        client.inGameHud.getChatHud().addMessage(Text.literal("[Patilanci] " + text));
    }
}
