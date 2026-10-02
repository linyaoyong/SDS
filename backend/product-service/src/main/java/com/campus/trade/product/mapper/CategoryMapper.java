package com.campus.trade.product.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.campus.trade.product.entity.Category;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import java.util.List;

@Mapper
public interface CategoryMapper extends BaseMapper<Category> {
    @Select("SELECT * FROM categories WHERE parent_id IS NULL AND status = 1 ORDER BY sort_order")
    List<Category> selectRootCategories();

    @Select("SELECT * FROM categories WHERE parent_id = #{parentId} AND status = 1 ORDER BY sort_order")
    List<Category> selectChildren(Long parentId);
}
