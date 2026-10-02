package com.campus.trade.message.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.campus.trade.message.entity.Message;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface MessageMapper extends BaseMapper<Message> {
    @Update("UPDATE messages SET is_read = 1, read_at = NOW() WHERE related_id = #{productId} AND receiver_id = #{receiverId} AND (sender_id = #{senderId} OR sender_id = 0) AND is_read = 0")
    int markRead(@Param("productId") Long productId, @Param("receiverId") Long receiverId, @Param("senderId") Long senderId);
}
