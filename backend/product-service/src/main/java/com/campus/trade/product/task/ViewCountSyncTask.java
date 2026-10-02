package com.campus.trade.product.task;

import com.campus.trade.product.mapper.ProductMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
@RequiredArgsConstructor
public class ViewCountSyncTask {

    private final StringRedisTemplate redisTemplate;
    private final ProductMapper productMapper;

    @Scheduled(fixedDelay = 600000) // Every 10 minutes
    public void syncViewCounts() {
        String lockKey = "scheduled:view-count-sync";
        String instanceId = UUID.randomUUID().toString();
        Boolean locked = redisTemplate.opsForValue()
                .setIfAbsent(lockKey, instanceId, 9, TimeUnit.MINUTES);
        if (Boolean.FALSE.equals(locked)) return;

        try {
            Set<String> keys = redisTemplate.keys("view_count:*");
            if (keys == null || keys.isEmpty()) return;

            for (String key : keys) {
                try {
                    String countStr = redisTemplate.opsForValue().getAndDelete(key);
                    if (countStr == null) continue;
                    Long productId = Long.parseLong(key.split(":")[1]);
                    int count = Integer.parseInt(countStr);
                    if (count > 0) {
                        productMapper.addViewCount(productId, count);
                        log.debug("Synced view count: product={}, count={}", productId, count);
                    }
                } catch (Exception e) {
                    log.error("Failed to sync view count for key {}", key, e);
                }
            }
        } catch (Exception e) {
            log.error("View count sync task failed", e);
        }
    }
}
