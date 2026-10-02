package com.campus.trade.common.constant;

public final class RedisKey {
    private RedisKey() {}

    public static final String REFRESH_TOKEN = "refresh_token:%d:%s";
    public static final String MESSAGE_DEDUP = "msgdedup:order:%s:%s:%s";
    public static final String SCHEDULED_DEDUCT_RETRY = "scheduled:deduct-retry";
    public static final String SCHEDULED_TIMEOUT_CANCEL = "scheduled:timeout-cancel";
    public static final String SCHEDULED_RESTORE_RETRY = "scheduled:restore-retry";
    public static final String VIEW_COUNT = "view_count:%d";
    public static final String VIEW_COUNT_SYNC_LOCK = "scheduled:view-count-sync";
    public static final String INTERNAL_TOKEN = "internal.token";
}
