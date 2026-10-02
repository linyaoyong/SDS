package com.campus.trade.common.constant;

public final class ErrorCode {
    private ErrorCode() {}

    // auth-service: 40001-40099
    public static final int USERNAME_EXISTS = 40001;
    public static final int LOGIN_FAILED = 40002;
    public static final int TOKEN_INVALID = 40003;
    public static final int REFRESH_TOKEN_INVALID = 40004;
    public static final int PHONE_EXISTS = 40005;
    public static final int EMAIL_EXISTS = 40006;
    public static final int STUDENT_ID_EXISTS = 40007;
    public static final int ACCOUNT_FROZEN = 40008;
    public static final int USER_NOT_FOUND = 40009;
    public static final int OLD_PASSWORD_WRONG = 40010;
    public static final int PASSWORD_FORMAT_INVALID = 40011;

    // product-service: 40100-40199
    public static final int PRODUCT_NOT_FOUND = 40100;
    public static final int NO_PERMISSION = 40101;
    public static final int STOCK_INSUFFICIENT = 40102;
    public static final int PRODUCT_STATUS_INVALID = 40103;
    public static final int IMAGE_COUNT_EXCEEDED = 40104;
    public static final int CATEGORY_NOT_FOUND = 40105;
    public static final int ONLY_OFF_SHELF_CAN_LIST = 40106;
    public static final int STOCK_ZERO_CANNOT_LIST = 40107;
    public static final int MUST_OFF_SHELF_FIRST = 40108;
    public static final int CATEGORY_DISABLED = 40109;

    // order-service: 40200-40299
    public static final int ORDER_NOT_FOUND = 40200;
    public static final int CANNOT_BUY_OWN = 40201;
    public static final int STATUS_NOT_ALLOW = 40202;
    public static final int NOT_BUYER_CANNOT_REVIEW = 40203;
    public static final int ONLY_COMPLETED_CAN_REVIEW = 40204;
    public static final int CONFLICT_RETRY = 40205;
    public static final int CANCEL_REASON_REQUIRED = 40206;
    public static final int ORDER_TIMEOUT_CANCELLED = 40207;

    // message-service: 40300-40399
    public static final int CONVERSATION_NOT_FOUND = 40300;
    public static final int MESSAGE_SEND_FAILED = 40301;
    public static final int CANNOT_CHAT_SELF = 40302;

    // system: 50000-50099
    public static final int INTERNAL_ERROR = 50000;
    public static final int SERVICE_UNAVAILABLE = 50001;
    public static final int VALIDATION_FAILED = 50002;
    public static final int FILE_UPLOAD_FAILED = 50003;
}
