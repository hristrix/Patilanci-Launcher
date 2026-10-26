package com.hristrix.skin;

/** Run by verifySkinLogic, with assertions enabled and no third-party test framework. */
public final class SkinApplicationTest {
    private static void idle(SkinApplication schedule, int count, boolean target, boolean permission) {
        for (int i = 0; i < count; i++) assert schedule.tick(target, permission) == SkinApplication.Action.NONE;
    }

    public static void main(String[] args) {
        assert SkinApplication.matches("SMP.EXAMPLE.COM:25565", "builder", "smp.example.com", "Builder");
        assert !SkinApplication.matches("other.example.com", "Builder", "smp.example.com", "Builder");
        assert !SkinApplication.matches("smp.example.com:25566", "Builder", "smp.example.com", "Builder");
        assert !SkinApplication.matches("smp.example.com", "OtherPlayer", "smp.example.com", "Builder");

        var schedule = new SkinApplication();
        schedule.join(false);
        idle(schedule, 500, false, true);
        schedule.join(true);
        idle(schedule, 99, true, true);
        assert schedule.tick(true, true) == SkinApplication.Action.APPLY;
        idle(schedule, 200, true, true);
        schedule.message("Incorrect password.");
        idle(schedule, 100, true, true);
        schedule.message("Successfully logged in. Welcome back!");
        idle(schedule, 39, true, true);
        assert schedule.tick(true, true) == SkinApplication.Action.RETRY;
        schedule.message("Successfully logged in. Welcome back!");
        idle(schedule, 500, true, true);

        schedule.join(true);
        schedule.message("Registered and authenticated successfully!");
        idle(schedule, 39, true, true);
        assert schedule.tick(true, true) == SkinApplication.Action.APPLY;
        idle(schedule, 500, true, true);

        schedule.join(true);
        idle(schedule, 300, true, false);
        assert schedule.tick(true, false) == SkinApplication.Action.UNAVAILABLE;
        idle(schedule, 500, true, false);
        schedule.message("Successfully logged in");
        idle(schedule, 39, true, false);
        assert schedule.tick(true, true) == SkinApplication.Action.APPLY;

        schedule.join(true);
        schedule.disconnect();
        idle(schedule, 500, true, true);
        schedule.join(true);
        idle(schedule, 500, false, true);
        System.out.println("Skin schedule checks passed: server/name scope, delayed application, bounded login retry, permission timeout, reconnect and disconnect.");
    }
}
