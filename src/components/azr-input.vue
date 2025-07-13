<template>
    <div class="flex-container">
        <el-input ref="inputRef" v-model="input" placeholder="Please input" @change="onChange" />
    </div>
</template>
<script setup>
import { ref, defineProps, defineEmits, nextTick, onMounted } from 'vue';
import { ElInput } from 'element-plus'

const props = defineProps({
    // value: {
    //     type: String,
    //     default: ''
    // },
    placeholder: {
        type: String,
        default: '请输入内容'
    },
    isDisabled: {
        type: Boolean,
        default: false
    },
    onChange: {
        type: Function,
        default: () => { }
    },
    onBlur: {
        type: Function,
        default: () => { }
    }
});

const input = defineModel('value') //ref(props.value);
const inputRef = ref(null);
onMounted(() => {
    nextTick(() => {
        if (inputRef.value) {
            inputRef.value.focus && inputRef.value.focus()
            inputRef.value.select && inputRef.value.select()
        }

    })
});

const onChange = (value) => {
    props.onChange(value);
};
</script>
<style lang="scss">
.flex-container {
    display: flex;
    align-items: center;
    width: 100%;
    height: 100%;
    background-color: white;
    // gap: 5px;
}
</style>