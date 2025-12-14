<template>
<!-- 顶部导航栏 -->
    <header class="glass-dark px-6 py-3 flex items-center justify-between z-50 relative">
        <div class="flex items-center space-x-3">
            <i class="fas fa-leaf text-primary text-2xl"></i>
            <h1 class="text-xl font-bold">开封市NDVI时空变化分析</h1>
        </div>
        
        <div class="flex items-center space-x-4">
            
            <button @click="()=>{emit('toggleDataPanel')}" class="nav-btn">
                <i class="fas fa-chart-bar"></i>
                <span>数据面板</span>
            </button>
            
            <button @click="()=>{emit('resetView')}" class="nav-btn">
                <i class="fas fa-redo"></i>
                <span>重置视图</span>
            </button>
            <!-- 导航栏按钮区新增（togglePanelBtn和resetViewBtn之间） -->
            
            <button @click="()=>{emit('toggleSimplified') }" class="nav-btn">
                <i class="fas fa-palette"></i>
                <span>精简显示</span>
            </button>
            
            <button @click="()=>{emit('toggleSetting')}" class="nav-btn">
                <i class="fas fa-cog"></i><span>参数设置</span>
            </button>
        </div>
    </header>

</template>

<script setup lang="ts">

const emit = defineEmits(['toggleDataPanel', 'resetView', 'toggleSimplified', 'toggleSetting'])

</script>

