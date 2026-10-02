package com.campus.trade.auth.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.campus.trade.auth.entity.User;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper extends BaseMapper<User> {
}
