package com.campus.trade.auth.service.impl;

import com.campus.trade.auth.entity.User;
import com.campus.trade.auth.entity.enums.UserRole;
import com.campus.trade.auth.entity.enums.UserStatus;
import com.campus.trade.auth.mapper.UserMapper;
import com.campus.trade.common.exception.BusinessException;
import com.campus.trade.common.util.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import java.util.Set;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthRefreshValidationTest {
    private final UserMapper users = mock(UserMapper.class);
    private final JwtUtil jwt = mock(JwtUtil.class);
    private final StringRedisTemplate redis = mock(StringRedisTemplate.class);
    private final AuthServiceImpl service = new AuthServiceImpl(users, jwt, redis);

    @Test
    void refusesRedisGlobInputBeforeLookingUpAnySession() {
        for (String input : new String[]{"*", "?", "[a-f]", "0123456789abcdef0123456789abcde*"}) {
            assertThatThrownBy(() -> service.refresh(input)).isInstanceOf(BusinessException.class);
        }
        verifyNoInteractions(redis, users, jwt);
    }

    @Test
    void refusesMissingAndMalformedTokensBeforeSessionLookup() {
        for (String input : new String[]{null, "", " ", "abc", "g".repeat(32)}) {
            assertThatThrownBy(() -> service.refresh(input)).isInstanceOf(BusinessException.class);
        }
        verifyNoInteractions(redis, users, jwt);
    }

    @Test
    @SuppressWarnings("unchecked")
    void validTokenStillRefreshesAndRotatesItsOwnSession() {
        String token = java.util.UUID.randomUUID().toString().replace("-", "");
        String key = "refresh_token:42:" + token;
        ValueOperations<String, String> values = mock(ValueOperations.class);
        when(redis.keys("refresh_token:*:" + token)).thenReturn(Set.of(key));
        when(redis.opsForValue()).thenReturn(values);
        when(values.get(key)).thenReturn("42");
        User user = new User();
        user.setId(42L);
        user.setUsername("demo");
        user.setRole(UserRole.STUDENT);
        user.setStatus(UserStatus.NORMAL);
        when(users.selectById(42L)).thenReturn(user);
        when(jwt.generateToken(42L, UserRole.STUDENT.getValue())).thenReturn("test-access-token");
        var response = service.refresh(token).getData();
        assertThat(response.getUserId()).isEqualTo(42L);
        assertThat(response.getAccessToken()).isEqualTo("test-access-token");
        assertThat(response.getRefreshToken()).matches("[0-9a-f]{32}").isNotEqualTo(token);
        verify(redis).delete(key);
        verify(values).set(eq("refresh_token:42:" + response.getRefreshToken()), eq("42"), eq(168L), eq(java.util.concurrent.TimeUnit.HOURS));
    }
}
