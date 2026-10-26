package com.hristrix.skin;

import java.util.Locale;

/** Bounded command schedule; independent of Minecraft so reconnect/login timing can be tested. */
final class SkinApplication {
    enum Action { NONE, APPLY, RETRY, UNAVAILABLE }
    private int ticks;
    private int due = -1;
    private boolean sent;
    private boolean authenticated;

    void join(boolean target) {
        ticks = 0;
        sent = false;
        authenticated = false;
        due = target ? 100 : -1;
    }

    void disconnect() { due = -1; }

    void message(String message) {
        String text = message.toLowerCase(Locale.ROOT);
        if (!authenticated && (text.contains("successfully logged in") || text.contains("logged in successfully")
            || text.contains("registered and authenticated successfully") || text.contains("successfully registered")
            || text.contains("already authenticated"))) {
            authenticated = true;
            due = ticks + 40;
        }
    }

    Action tick(boolean target, boolean commandAllowed) {
        ticks++;
        if (due < 0 || ticks < due || !target) return Action.NONE;
        if (!commandAllowed) {
            if (ticks > due + 200) {
                due = -1;
                return Action.UNAVAILABLE;
            }
            return Action.NONE;
        }
        due = -1;
        Action action = sent ? Action.RETRY : Action.APPLY;
        sent = true;
        return action;
    }

    static boolean matches(String server, String player, String expectedServer, String expectedPlayer) {
        return server != null && player != null && normalize(server).equals(normalize(expectedServer))
            && player.equalsIgnoreCase(expectedPlayer);
    }

    private static String normalize(String server) {
        return server.toLowerCase(Locale.ROOT).replaceFirst(":25565$", "");
    }
}
