package com.campus.trade.product.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.campus.trade.product.entity.Product;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface ProductMapper extends BaseMapper<Product> {
    @Update("UPDATE products SET view_count = view_count + #{count}, updated_at = NOW() WHERE id = #{id}")
    int addViewCount(@Param("id") Long id, @Param("count") int count);

    @Update("UPDATE products SET stock_quantity = #{quantity}, version = version + 1, updated_at = NOW() WHERE id = #{id} AND version = #{version}")
    int updateStock(@Param("id") Long id, @Param("quantity") int quantity, @Param("version") int version);

    @Update("UPDATE products SET status = #{status}, updated_at = NOW() WHERE id = #{id} AND version = #{version}")
    int updateStatus(@Param("id") Long id, @Param("status") int status, @Param("version") int version);

    @Update("UPDATE products SET like_count = like_count + #{delta}, updated_at = NOW() WHERE id = #{id}")
    int incrementLikeCount(@Param("id") Long id, @Param("delta") int delta);

    @Update("UPDATE products SET sold_count = sold_count + 1, updated_at = NOW() WHERE id = #{id}")
    int incrementSoldCount(@Param("id") Long id);
}
