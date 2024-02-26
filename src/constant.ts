// 避免影响其他的装饰器设置元数据时出现命名冲突，需要使用 Symbol 类型
export const DEPENDENCIES = Symbol('esdi.dependencies')
