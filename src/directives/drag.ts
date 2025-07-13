import type { DirectiveBinding } from 'vue'
import { provide, ref, render, nextTick, createApp, } from 'vue'
import { ElInput } from 'element-plus'

import type { FunctionalComponent } from 'vue'
import { h, withKeys } from 'vue'
import type { Column, InputInstance } from 'element-plus'
import azrInput from '@/components/azr-input.vue'

interface TableDragBinding {
    tableRef?: any,
    onEditCell?: Function,
    // onEmptyRow?: Function,
    onCellChange?: (row: number, prop: string, value: any) => void,
}

const menuItems = ref([
    [
        { label: 'Insert Above', action: 'insertRowAbove' },
        { label: 'Insert Below', action: 'insertRowBelow' }
    ],
    [
        { label: 'Delete Row', action: 'deleteCurrentRow' },
        { label: 'Delete Selected Rows', action: 'deleteSelectedRows' }
    ],
    [
        { label: 'Copy', action: 'copyToClipboard' },
        { label: 'Paste', action: 'pasteFromClipboard' }
    ]
])

const columnProps = ref<{ prop: string, type: string }[]>([])

const domUtils = {
    findCell: (el: HTMLElement, event: MouseEvent): Element | null => {
        let target = event.target as HTMLElement
        while (target && target.tagName !== 'TD') {
            target = target.parentElement as HTMLElement
            if (!target || target.tagName === 'TABLE') return null
        }
        return target
    },
    getCellPosition: (cell: HTMLElement): { row: number; col: number } => {
        const tr = cell.parentElement as HTMLTableRowElement
        const table = tr.closest('table')
        if (!table) return { row: 0, col: 0 }

        const rows = Array.from(table.querySelectorAll('tbody tr'))
        const cells = Array.from(tr.querySelectorAll('td'))

        return {
            row: rows.indexOf(tr),
            col: cells.indexOf(cell)
        }
    },
    getTableRect: (el: HTMLElement) => el.getBoundingClientRect(),
    getCellRect: (cell: HTMLElement) => cell.getBoundingClientRect(),
    writeTextToClipboard: async (selArea: any, tableData: any) => {
        try {
            // 按行列分组
            const grouped: Record<number, Record<number, string>> = {}
            selArea.forEach((cell) => {
                if (!grouped[cell.row]) grouped[cell.row] = {}
                // 动态获取 value
                grouped[cell.row][cell.col] = tableData[cell.row][cell.prop]
            })

            // 排序并拼接为字符串（行用\n，列用\t）
            const rows = Object.keys(grouped)
                .sort((a, b) => Number(a) - Number(b))
                .map((rowIdx) => {
                    const cols = grouped[rowIdx]
                    // 按列顺序输出
                    const colVals = Object.keys(cols)
                        .sort((a, b) => Number(a) - Number(b))
                        .map((colIdx) => cols[colIdx])
                    return colVals.join('\t')
                })
            const text = rows.join('\n')

            // 写入剪切板
            try {
                await navigator.clipboard.writeText(text)
            } catch (err) {
                console.error('复制失败', err)
            }
        } catch (err) {
            console.error('复制失败', err)
        }
    },
    readTextFromClipboard: async (selArea: any, tableData: any) => {
        try {
            const text = await navigator.clipboard.readText()
            if (text.trim() === '') {
                console.warn('剪切板内容为空')
                return
            }
            // 解析为二维数组
            // 判断分隔符，支持 \t（Excel）、,（CSV）
            let rows: string[][]
            if (text.includes('\t')) {
                // Excel 复制，使用制表符
                rows = text
                    .trim()
                    .split(/\r?\n/)
                    .map((row) => row.split('\t'))
            } else if (text.includes(',')) {
                // CSV 粘贴，使用逗号
                rows = text
                    .trim()
                    .split(/\r?\n/)
                    .map((row) => row.split(','))
            } else {
                // 单列
                rows = text
                    .trim()
                    .split(/\r?\n/)
                    .map((row) => [row])
            }


            if (!selArea.length) return
            // 取选区最小行、列
            const minRow = Math.min(...selArea.map((cell) => cell.row))
            const minCol = Math.min(...selArea.map((cell) => cell.col))

            // 获取所有数据列的 prop（跳过 type="index"/"selection"）
            const colIndexToProp = columnProps.value.map((col) => col.prop)

            // 写入数据
            rows.forEach((rowArr, rIdx) => {
                const dataRowIdx = minRow + rIdx
                if (dataRowIdx >= tableData.length) return
                rowArr.forEach((cellVal, cIdx) => {
                    const dataColIdx = minCol + cIdx
                    const prop = colIndexToProp[dataColIdx]
                    if (prop) {
                        tableData[dataRowIdx][prop] = cellVal
                    }
                })
            })
        } catch (err) {
            console.error('粘贴失败', err)
        }
    }

}

const dataUtils = {
    getColumnProps: (elRef: any) => {
        if (!elRef || !elRef.columns) {
            console.warn('Table columns not available')
            return []
        }

        const columns = ref<{ prop: string, type: string }[]>([]) // tableRef.value.columns
        elRef.columns.forEach(col => {
            if (col.children?.length) {
                // Add all child columns with properties
                columns.value.push(...col.children
                    // .filter(child => child.property)
                    .map(child => ({
                        prop: child.property,
                        type: child.type
                    })));
            } else {
                // Add top-level column if it has a property
                columns.value.push({
                    prop: col.property,
                    type: col.type
                });
            }
        });

        columnProps.value = columns.value
        // return columns.value;
    },
    createEmptyRow: (cb: Function) => {
        const newRow = {}
        columnProps.value.forEach(col => {
            if (col.prop && col.type !== 'index' && col.type !== 'selection') {
                switch (col.type) {
                    case 'boolean':
                        newRow[col.prop] = false;
                        break;
                    // case 'number':
                    //     newRow[col.prop] = null;
                    //     break;
                    // case 'date':
                    // case 'datetime':
                    //     newRow[col.prop] = '';
                    //     break;
                    // case 'select':
                    //     newRow[col.prop] = '';
                    //     break;
                    default:
                        newRow[col.prop] = null;
                }

                // Use callback if provided, otherwise use default value
                if (cb && typeof cb === 'function') {
                    cb(newRow, col.prop, null)
                }
            }
        })
        return newRow
    }
    // createEmptyRow: (columns) => {
    //     return columns.reduce((row, col) => {
    //         if (col.prop && !['selection', 'index'].includes(col.type)) {
    //             row[col.prop] = col.type === 'boolean' ? false : ''
    //         }
    //         return row
    //     }, {})
    // }
}

type SelectionCellProps = {
    value: string
    intermediate?: boolean
    onChange: (value: string) => void
    onBlur: () => void
    onKeydownEnter: () => void
    forwardRef: (el: InputInstance) => void
}


const InputCell: FunctionalComponent<SelectionCellProps> = (props) => {
    return h(ElInput, {
        ref: props.forwardRef,
        onInput: (val: string) => props.onChange(val),
        onBlur: props.onBlur,
        onKeydown: withKeys(props.onKeydownEnter, ['enter']),
        modelValue: props.value,
        size: 'small',
        clearable: false,
        style: {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            zIndex: '10',
            border: 'none',
            background: 'transparent',
        }
    })
}

const createContextMenu = (actions: any, cb: Function) => {
    const menu = document.createElement('div')
    menu.className = 'custom-context-menu'
    menu.style.cssText = ` position: fixed;       
        z-index: 9999;
        background: #fff;
        border: 1px solid #ccc;
        padding: 4px 0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        min-width: 80px;
        display: none;`
    // Add style element for hover effects
    const style = document.createElement('style')
    style.textContent = `
      .custom-context-menu li:hover {
        background-color: var(--el-color-primary-light-9, #ecf5ff);
      }
    `
    // menu.appendChild(style)

    const html = menuItems.value.map(group => `
    <ul class="azt-context-menu--option-wrapper" style="font-size:13px;margin:0;padding:0.5em;">
      ${group.map(item => `
        <li data-action="${item.action}" style="display:block;padding:6px;text-align:center;cursor:pointer">
          ${item.label}
        </li>
      `).join('')}
    </ul>
  `).join('')

    menu.innerHTML = html
    menu.insertBefore(style, menu.firstChild)

    menu.addEventListener('click', (e) => {
        const action = e.target.closest('li')?.dataset.action
        if (action && actions[action]) {
            actions[action]()
            menu.style.display = 'none'
            cb()
        }
    })


    menu.addEventListener('mousedown', (e) => e.stopPropagation())

    menu.addEventListener('mouseleave', (e) => {
        menu.style.display = 'none'
    })

    return menu
}


const initDirective = (el: HTMLElement, binding: DirectiveBinding<TableDragBinding>) => {
    const overlay = document.createElement('div')
    overlay.className = 'cell-overlay'
    Object.assign(overlay.style, {
        position: 'absolute',
        boxSizing: 'border-box',
        background: 'var(--el-color-primary-light-8)',
        border: '1px solid var(--el-color-primary)',
        borderRadius: '0px',
        pointerEvents: 'none',
        zIndex: '100',
        display: 'none',
        opacity: '0.4'
    })

    const corner = document.createElement('div')
    corner.className = 'cell-corn'
    Object.assign(corner.style, {
        position: 'absolute',
        right: '-3px',
        bottom: '-3px',
        width: '6px',
        height: '6px',
        background: 'var(--el-color-primary-dark-2)',
        borderRadius: '3px',
        zIndex: '101',
        cursor: 'crosshair',
        pointerEvents: 'auto',
        opacity: '0.9'
    })

    overlay.appendChild(corner)

    const editCell = document.createElement('div')
    overlay.className = 'edit-overlay'
    Object.assign(overlay.style, {
        position: 'absolute',
        boxSizing: 'border-box',
        borderRadius: '0px',
        zIndex: '1000',
        display: 'none'
    })
    overlay.append(editCell)
    el.after(overlay)



    el._cellOverlay = { overlay, corner, editCell }
}

export const drag = {
    mounted(el: HTMLElement, binding: DirectiveBinding<TableDragBinding>) {
        // 获取列属性
        initDirective(el, binding)


        // 集中状态管理
        // const createState = () => ({
        //     selection: {
        //         isMouseDown: ref(false),
        //         direction: ref('vertical'),
        //         startPosition: ref({ row: -1, col: -1 }),
        //         area: ref([]),
        //         rect: ref({ visible: false, left: 0, top: 0, width: 0, height: 0 })
        //     },
        //     dragging: {
        //         isActive: ref(false),
        //         startCell: ref({ row: -1, col: -1 }),
        //         endCell: ref({ row: -1, col: -1 }),
        //         area: ref([])
        //     },
        //     context: ref({ visible: false, x: 0, y: 0, row: null, column: null, cell: null }),
        //     columns: ref([])
        // })

        //区域
        const isMouseDown = ref(false)
        const selectionDirection = ref('vertical') // 'horizontal' or 'vertical'
        const startCellPosition = ref({ row: -1, col: -1 })
        const selArea = ref<{ row: number; col: number; prop: string; type: string }[]>([])
        const selectionRect = ref({ visible: false, left: 0, top: 0, width: 0, height: 0 })

        // 角点拖动
        const isCornerDragging = ref(false)
        const dragStartCell = ref({ row: -1, col: -1 }) // 开始拖动的单元格
        const dragEndCell = ref({ row: -1, col: -1 }) // 结束拖动的单元格
        const dragArea = ref<{ row: number; col: number; prop: string; type: string }[]>([])

        const contextMenu = ref({ visible: false, x: 0, y: 0, row: -1, column: -1, cell: null, })
        let menuCreated = false

        const handleMouseEvent = (event: MouseEvent) => {
            switch (event.type) {
                case 'click': return handleMouseClick(event)
                case 'mousedown': return handleMouseDown(event)
                case 'mousemove': return handleMouseMove(event)
                case 'mouseup': return handleMouseUp(event)
                case 'contextmenu': return handleContextMenu(event)
                // case 'scroll': return handleMouseScroll(event)
            }
        }

        el.addEventListener('click', handleMouseEvent)
        el.addEventListener('mousedown', handleMouseEvent)
        el.addEventListener('mousemove', handleMouseEvent)
        el.addEventListener('mouseup', handleMouseEvent)
        el.addEventListener('contextmenu', handleMouseEvent)



        const handleMouseClick = (event: MouseEvent) => {
            const cell = domUtils.findCell(el, event)
            if (cell) {
                if (event.target && ((event.target as HTMLElement).tagName === 'IMG' || (event.target as HTMLElement).tagName === 'img')) {

                    return
                } else {
                    if (cell) {

                        const position = domUtils.getCellPosition(cell)
                        calculateSelectionRect(position, position, 'vertical') // 默认方向为垂直     


                        // Get column info
                        const column = columnProps.value[position.col]
                        if (!column || !column.prop || column.type === 'selection' || column.type === 'index') return

                        updateEditingCell(cell, position);
                    }
                }
            }
        }

        const handleMouseDown = (event: MouseEvent) => {
            event.preventDefault()
            isMouseDown.value = true

            const cell = domUtils.findCell(el, event)
            if (cell) {
                const position = domUtils.getCellPosition(cell)
                startCellPosition.value = position
                selectionDirection.value = 'vertical'
            }
        }

        const updateEditingCell = (cell: HTMLElement,position: { row: number; col: number }) => {
            const cellKey = position ? `${position.row}-${columnProps.value[position.col].prop}` : ''
            if (binding.value?.onEditCell) {
                binding.value.onEditCell(cellKey)
            }
        }

        const updateEditingCell2 = (cell: HTMLElement, position: { row: number; col: number }) => {

            const column = columnProps.value[position.col]
            const currentValue = el._tableData[position.row][column.prop]


            const tableData = ref(binding.value?.tableRef?.data || el._tableData)

            const inputContainer = document.createElement('div')
            inputContainer.className = 'azt-cell-editor'
            inputContainer.style.position = 'absolute'
            inputContainer.style.top = '0'
            inputContainer.style.left = '0'
            inputContainer.style.width = '100%'
            inputContainer.style.height = '100%'


            // Ensure cell has position relative for absolute positioning of editor
            // const originalPosition = cell.style.position
            // cell.style.position = 'relative'

            // Add container to cell
            cell.appendChild(inputContainer)

            const inputRef = ref()
            const inputComponent = h(InputCell, {
                forwardRef: (inputEl: any) => { inputRef.value = inputEl },
                onChange: (val: string) => {
                    if (binding.value?.onCellChange) {
                        binding.value.onCellChange(position.row, column.prop, val);
                    }

                },
                onBlur: () => {
                    // Clean up when input loses focus
                    inputContainer.remove()
                    // cell.style.position = originalPosition
                },
                onKeydownEnter: () => {
                    // Clean up when Enter is pressed
                    inputContainer.remove()
                    // cell.style.position = originalPosition
                },
                value: currentValue,
                size: 'small',
                clearable: false,
                style: {
                    width: '100%',
                    height: '100%',
                    zIndex: '10'
                }
            })

            // Render into the container instead of directly into the cell
            render(inputComponent, inputContainer)
            nextTick(() => {
                if (inputRef.value) {
                    inputRef.value.focus()
                    inputRef.value.select()
                }
            })

            // const inputComponent = h(azrInput, {
            //     value: currentValue,
            //     // forwardRef: (el) => { inputRef.value = el },
            //     onChange: (val) => {
            //         tableData[position.row][column.prop] = val
            //     },
            //     onKeydownEnter: () => { }
            // })

            // render(inputComponent, el._cellOverlay.editCell)
            // renderEditCell(true);
            //   Array.from(cell.querySelectorAll('.cell')).forEach((el) => {
            //     el.style.display = 'none'
            // })
            // document.body.appendChild(inputContainer)
        }

        const handleMouseMove = (event: MouseEvent) => {
            event.preventDefault() // 防止文本选择
            contextMenu.value.visible = false
            if (!isMouseDown.value || !startCellPosition.value) return
            // 查找当前鼠标所在的单元格
            const currentCell = domUtils.findCell(el, event)
            if (!currentCell) return


            // 获取当前单元格位置
            const currentPosition = domUtils.getCellPosition(currentCell)

            updateEditingCell(currentCell,null)

            //计算移动区域
            calculateSelectionRect(startCellPosition.value, currentPosition, selectionDirection.value)
        }

        const handleMouseUp = (event: MouseEvent) => {
            isMouseDown.value = false
        }

        const handleContextMenu = (event: MouseEvent) => {
            event.preventDefault()
            const cell = domUtils.findCell(el, event)
            if (!cell)
                return

            const position = domUtils.getCellPosition(cell)
            contextMenu.value = {
                visible: true,
                x: event.clientX,
                y: event.clientY,
                row: position.row,
                column: position.col,
                cell,
            }
            if (cell) {
                if (!menuCreated) {
                    const menu = createContextMenu(el._menuActions, () => {
                        selectionRect.value.visible = false
                        renderOverlayRect()
                    })
                    el.after(menu)
                    el._cellOverlay.menu = menu
                    menuCreated = true
                }
                // const position = domUtils.getCellPosition(cell)
                // 如果当前右击单元格不在选区内，则更新选区
                if (!selArea.value.some(_ => _.row === position.row && _.col === position.col) || selArea.value.length == 0) {
                    calculateSelectionRect(position, position, selectionDirection.value)
                }
                el._contextMenu = contextMenu.value
                renderContextMenu();
            }
        }

        const handleMouseScroll = (event: MouseEvent) => {
            isMouseDown.value = false
            selectionRect.value.visible = false

            // Update overlay position when scrolling
            const overlay = el._cellOverlay?.overlay
            if (overlay) {
                overlay.style.display = 'none'
            }
        }

        window.addEventListener('keydown', (event) => {
            handleKeyDown(event)
        })

        const handleKeyDown = (event) => {
            try {
                // 判断是否在表格内（可选，提升体验）
                // const active = document.activeElement
                // const isTable = .value?.$el?.contains(active)
                // if (!isTable) return

                if (selArea.value.length === 0) {
                    return
                }

                // Ctrl+C 复制
                if ((event.ctrlKey || event.metaKey) && event.key === 'c' && !event.shiftKey) {
                    event.preventDefault()
                    domUtils.writeTextToClipboard(selArea.value, el._tableData)
                }
                // Ctrl+V 粘贴
                if ((event.ctrlKey || event.metaKey) && event.key === 'v' && !event.shiftKey) {
                    event.preventDefault()
                    domUtils.readTextFromClipboard(selArea.value, el._tableData)
                }
            } catch (err) {
                console.error('失败:', event, event)
            }
        }

        el._cellOverlay.corner.addEventListener('mousedown', (event: MouseEvent) => {
            if (!selArea.value.length) return
            event.preventDefault()
            onCornerMouseDown(event)
            // // 全局监听
            window.addEventListener('mousemove', onCornerMouseMove)
            window.addEventListener('mouseup', onCornerMouseUp)
            // el._cellOverlay.corner.addEventListener('mousemove', onCornerMouseMove)
            // el._cellOverlay.corner.addEventListener('mouseup', onCornerMouseUp)
        })

        const onCornerMouseDown = (event: MouseEvent) => {
            const cellRect = (event.currentTarget as HTMLElement).getBoundingClientRect()
            const crosshairSize = 8
            if (
                event.clientX < cellRect.right - crosshairSize ||
                event.clientY < cellRect.bottom - crosshairSize
            ) {
                return
            }

            isCornerDragging.value = true
            dragArea.value = [...selArea.value]

            const dragRows = dragArea.value.map((cell: any) => cell.row)
            const dragCols = dragArea.value.map((cell: any) => cell.col)

            dragStartCell.value = {
                row: Math.min(...dragRows),
                col: Math.min(...dragCols),
            }

            dragEndCell.value = {
                row: Math.max(...dragRows),
                col: Math.max(...dragCols),
            }
        }

        // 监听鼠标移动事件
        const onCornerMouseMove = (event: MouseEvent) => {
            if (!isCornerDragging.value || !dragStartCell.value) return

            // 查找当前鼠标所在的单元格
            const currentCell = domUtils.findCell(el, event)
            if (!currentCell) return

            // 获取当前单元格位置
            const currentPosition = domUtils.getCellPosition(currentCell)

            // 如果方向还未确定，则根据移动确定方向
            if (!selectionDirection.value) {
                // 计算水平和垂直方向的移动距离
                const horizDiff = Math.abs(currentPosition.col - dragStartCell.value.col)
                const vertDiff = Math.abs(currentPosition.row - dragStartCell.value.row)

                // 根据移动较大的方向确定选择方向
                if (horizDiff > vertDiff) {
                    selectionDirection.value = 'horizontal'
                } else if (vertDiff > 0) {
                    selectionDirection.value = 'vertical'
                    return
                } else {
                    // 移动太小，还不能确定方向
                    return
                }
            }

            // // 限制纵向拖拽时横坐标只能在初始选区列区间
            // if (selectionDirection.value === 'vertical' && dragEndCell.value.col != currentPosition.col)
            //     currentPosition.col = dragEndCell.value.col

            calculateSelectionRect(dragStartCell.value, currentPosition, selectionDirection.value)
        }

        const onCornerMouseUp = (event: MouseEvent) => {
            if (isCornerDragging.value && dragArea.value.length > 0 && selArea.value.length > 0) {
                copyAreaToDragRec()
            }
            isCornerDragging.value = false
            window.removeEventListener('mousemove', onCornerMouseMove)
            window.removeEventListener('mouseup', onCornerMouseUp)
            // el._cellOverlay.corner.removeEventListener('mousemove', onCornerMouseMove)
            // el._cellOverlay.corner.removeEventListener('mouseup', onCornerMouseUp)
        }


        const calculateSelectionRect = (
            start: { row: number; col: number },
            current: { row: number; col: number },
            direction: string
        ) => {
            const minRow = Math.min(start.row, current.row)
            const maxRow = Math.max(start.row, current.row)
            const minCol = Math.min(start.col, current.col)
            const maxCol = Math.max(start.col, current.col)

            selArea.value = Array(maxRow - minRow + 1).fill(0)
                .flatMap((_, rowOffset) => {
                    const row = minRow + rowOffset
                    return Array(maxCol - minCol + 1).fill(0)
                        .map((_, colOffset) => {
                            const col = minCol + colOffset
                            const column = columnProps.value[col]
                            if (!column || column.type === 'selection' || column.type === 'index') {
                                return null
                            }
                            return { row, col, prop: column.prop, type: column.type }
                        })
                        .filter(Boolean) // 移除无效列
                })

            el._selArea = selArea.value

            if (!selArea.value.length) {
                selectionRect.value.visible = false
                return
            }

            const rows = el.querySelectorAll('.el-table__row')
            const startCell = rows[minRow]?.querySelectorAll('td.el-table__cell')[minCol]
            const endCell = rows[maxRow]?.querySelectorAll('td.el-table__cell')[maxCol]
            if (!startCell || !endCell) {
                selectionRect.value.visible = false
                return
            }
            const tableRect = el.getBoundingClientRect()
            const startRect = startCell.getBoundingClientRect()
            const endRect = endCell.getBoundingClientRect()
            selectionRect.value = {
                visible: true,
                left: startRect.left - tableRect.left + el.scrollLeft,
                top: startRect.top - tableRect.top - el.scrollTop,
                width: endRect.right - startRect.left,
                height: endRect.bottom - startRect.top,
            }
            el._selectionRect = selectionRect.value
            renderOverlayRect();
        }

        const renderOverlayRect = () => {
            const rect = selectionRect.value;
            if (rect && typeof rect === 'object' && rect.visible) {
                const overlay = el._cellOverlay?.overlay
                if (overlay) {
                    overlay.style.display = ''
                    overlay.style.left = (rect.left || 0) + 'px'
                    overlay.style.top = (rect.top || 0) + 'px'
                    overlay.style.width = (rect.width || 0) + 'px'
                    overlay.style.height = (rect.height || 0) + 'px'
                }
                el._cellOverlay.corner.style.cursor = 'crosshair'
            } else {
                const overlay = el._cellOverlay?.overlay
                if (overlay) {
                    overlay.style.display = 'none'
                }
                selArea.value = []
                isMouseDown.value = false
                selectionDirection.value = 'vertical' // 'horizontal' or 'vertical'
                startCellPosition.value = { row: -1, col: -1 }
                selectionRect.value = { visible: false, left: 0, top: 0, width: 0, height: 0 }
            }
        }

        const renderContextMenu = () => {
            const rect = contextMenu.value;
            if (contextMenu && typeof contextMenu.value === 'object' && contextMenu.value.visible) {
                const menu = el._cellOverlay?.menu
                if (menu) {
                    menu.style.display = ''
                    menu.style.left = (rect.x || 0) + 'px'
                    menu.style.top = (rect.y || 0) + 'px'
                }
                // 添加或更新菜单项的事件监听
                // bindingContextMenuEvent(menu, el)
            } else {
                const menu = el._cellOverlay?.menu
                if (menu) {
                    menu.style.display = 'none'
                }
                // 角点拖动
                isCornerDragging.value = false
                dragStartCell.value = { row: -1, col: -1 }
                dragEndCell.value = { row: -1, col: -1 }
                dragArea.value = []

                contextMenu.value = { visible: false, x: 0, y: 0, row: null, column: null, cell: null, }
                // menuCreated = false
            }
        }

        const renderEditCell = (visible) => {

            //    inputContainer.style.position = 'absolute'
            // inputContainer.style.top = `${cellRect.top}px`
            // inputContainer.style.left = `${cellRect.left}px`
            // inputContainer.style.width = `${cellRect.width}px`
            // inputContainer.style.height = `${cellRect.height}px`
            // inputContainer.style.borderRadius = '0px'
            // inputContainer.style.zIndex = '1000'


            const rect = selectionRect.value;
            if (visible) {
                const editCell = el._cellOverlay?.editCell
                if (editCell) {
                    editCell.style.display = ''
                    editCell.style.left = (rect.left || 0) + 'px'
                    editCell.style.top = (rect.top || 0) + 'px'
                    editCell.style.width = (rect.width || 0) + 'px'
                    editCell.style.height = (rect.height || 0) + 'px'
                }
            } else {
                const overlay = el._cellOverlay?.editCell
                if (overlay) {
                    overlay.style.display = 'none'
                }
                // selArea.value = []
                // isMouseDown.value = false
                // selectionDirection.value = 'vertical' // 'horizontal' or 'vertical'
                // startCellPosition.value = { row: -1, col: -1 }
                // selectionRect.value = { visible: false, left: 0, top: 0, width: 0, height: 0 }
            }
        }

        const copyAreaToDragRec = () => {
            const tableData = binding.value?.tableRef?.data || el._tableData || []
            if (!tableData || tableData.length === 0 || !Array.isArray(tableData)) {
                console.warn('Table data not available or not an array')
                return
            }
            if (!dragArea.value.length || !selArea.value.length) return
            // 先构建 selArea 的唯一标识集合
            const selSet = new Set(dragArea.value.map((cell) => `${cell.row}-${cell.col}`))
            // 过滤 dragArea，不要已存在的单元格
            const toCopy = selArea.value.filter((cell) => !selSet.has(`${cell.row}-${cell.col}`))
            // 合并到 selArea
            // selArea.value = selArea.value.concat(toCopy)
            const dragLen = dragArea.value.length
            toCopy.forEach((cell, idx) => {
                // 找到 dragArea 中对应的单元格（循环利用）
                const dragCell = dragArea.value[idx % dragLen]
                if (dragCell && cell.prop) {
                    el._tableData[cell.row][cell.prop] = el._tableData[dragCell.row][dragCell.prop]
                }
            })
        }

        const initEmptyRow = binding.value?.onEmptyRow
        const insertRowAbove = () => {
            const tableData = binding.value?.tableRef?.data || el._tableData || []
            const rowIndex = contextMenu.value.row
            if (rowIndex >= 0) {
                const newRow = dataUtils.createEmptyRow(initEmptyRow) // Create an empty row with your schema
                tableData.splice(rowIndex, 0, newRow)
            }
        }

        const insertRowBelow = () => {
            const tableData = binding.value?.tableRef?.data || el._tableData || []
            const rowIndex = contextMenu.value.row
            if (rowIndex >= 0) {
                const newRow = dataUtils.createEmptyRow(initEmptyRow) // Create an empty row with your schema
                tableData.splice(rowIndex + 1, 0, newRow)
            }
        }

        const deleteCurrentRow = () => {
            const tableData = binding.value?.tableRef?.data || el._tableData || []
            const rowIndex = contextMenu.value.row
            if (rowIndex >= 0) {
                tableData.splice(rowIndex, 1)
            }
        }

        const deleteSelectedRows = () => {
            const tableData = binding.value?.tableRef?.data || el._tableData || []

            // Get unique rows from selection area
            const rowsToDelete = [...new Set(selArea.value.map(cell => cell.row))]
                .sort((a, b) => b - a) // Sort in descending order to delete from bottom to top

            // Delete rows
            rowsToDelete.forEach(rowIndex => {
                if (rowIndex >= 0 && rowIndex < tableData.length) {
                    tableData.splice(rowIndex, 1)
                }
            })
        }

        const copyToClipboard = () => {
            const tableData = binding.value?.tableRef?.data || el._tableData || []

            // Implementation of copy to clipboard
            if (!selArea.value.length) return

            // Create a map to organize data by rows
            const rowData = {}

            // Collect data from selected cells
            selArea.value.forEach(cell => {
                if (!rowData[cell.row]) rowData[cell.row] = []
                const value = tableData[cell.row]?.[cell.prop] || ''
                rowData[cell.row][cell.col] = value
            })

            // Format data as tab-separated values
            let clipboardText = ''
            Object.keys(rowData).sort((a, b) => parseInt(a) - parseInt(b)).forEach(rowIndex => {
                const row = rowData[rowIndex]
                clipboardText += Object.keys(row).sort((a, b) => parseInt(a) - parseInt(b))
                    .map(colIndex => row[colIndex])
                    .join('\t') + '\n'
            })

            // Copy to clipboard
            navigator.clipboard.writeText(clipboardText).then(() => {
                console.log('Copied to clipboard')
            }).catch(err => {
                console.error('Failed to copy: ', err)
            })
        }

        const pasteFromClipboard = () => {
            const tableData = binding.value?.tableRef?.data || el._tableData || []

            // Implementation of paste from clipboard
            if (!contextMenu.value.row && contextMenu.value.row !== 0) return

            navigator.clipboard.readText().then(text => {
                const rows = text.trim().split('\n')
                const startRow = contextMenu.value.row

                rows.forEach((rowText, rowOffset) => {
                    const values = rowText.split('\t')
                    const targetRow = startRow + rowOffset

                    if (targetRow < tableData.length) {
                        // Get available columns starting from the clicked column
                        const availableCols = columnProps.value.slice(contextMenu.value.column)
                            .filter(col => col.prop && col.type !== 'selection' && col.type !== 'index')

                        // Update each cell with corresponding pasted value
                        values.forEach((value, colOffset) => {
                            const targetCol = availableCols[colOffset]
                            if (targetCol && targetCol.prop) {
                                tableData[targetRow][targetCol.prop] = value
                            }
                        })
                    }
                })
            }).catch(err => {
                console.error('Failed to paste: ', err)
            })

            contextMenu.value.visible = false
        }
        // Map actions to their functions
        el._menuActions = {
            insertRowAbove,
            insertRowBelow,
            deleteCurrentRow,
            deleteSelectedRows,
            copyToClipboard,
            pasteFromClipboard
        }

        el._tableEventHandlers = {
            handleMouseScroll,
            events: [
                { element: el, type: 'click', handler: handleMouseEvent },
                { element: el, type: 'mousedown', handler: handleMouseEvent },
                { element: el, type: 'mousemove', handler: handleMouseEvent },
                { element: el, type: 'mouseup', handler: handleMouseEvent },
                { element: el, type: 'contextmenu', handler: handleMouseEvent },
                { element: el._cellOverlay.corner, type: 'mousedown', handler: onCornerMouseDown },
                { element: el._cellOverlay.corner, type: 'mousemove', handler: onCornerMouseMove },
                { element: el._cellOverlay.corner, type: 'mouseup', handler: onCornerMouseUp },
                { element: window, type: 'keydown', handler: handleKeyDown }
            ]
        }
    },
    updated(el: HTMLElement, binding: DirectiveBinding<TableDragBinding>) {
        // 检测 columnProps 是否有实际变化
        const options: TableDragBinding = binding.value || {}
        if (!options?.tableRef.columns || options?.tableRef.columns.length === 0) {
            return
        }

        const oldProps = el._initialBinding || []
        const newProps = options?.tableRef.columns || []
        el._editingCellKey = options?.editingCellKey || ''

        el._tableData = options?.tableRef?.data || []
        // Check if columns have changed (including children)
        let hasChanged = false;
        // Different length is an immediate sign of change
        if (newProps.length !== oldProps.length) {
            hasChanged = true;
        } else {
            // Deep comparison of columns and their children
            for (let i = 0; i < newProps.length; i++) {
                const newCol = newProps[i];
                const oldCol = oldProps[i];

                // Compare basic properties
                if (newCol.property !== oldCol.property || newCol.type !== oldCol.type) {
                    hasChanged = true;
                    break;
                }

                // Compare children if they exist
                if (Array.isArray(newCol.children) && Array.isArray(oldCol.children)) {
                    if (newCol.children.length !== oldCol.children.length) {
                        hasChanged = true;
                        break;
                    }

                    // Compare each child column
                    for (let j = 0; j < newCol.children.length; j++) {
                        const newChild = newCol.children[j];
                        const oldChild = oldCol.children[j];

                        if (newChild.property !== oldChild.property ||
                            newChild.type !== oldChild.type) {
                            hasChanged = true;
                            break;
                        }
                    }

                    if (hasChanged) break;
                } else if (!!newCol.children !== !!oldCol.children) {
                    // One has children, the other doesn't
                    hasChanged = true;
                    break;
                }
            }
        }

        // Only update if there are actual changes
        if (hasChanged) {
            el._initialBinding = JSON.parse(JSON.stringify(newProps)); // Deep clone to avoid reference issues
            dataUtils.getColumnProps(options?.tableRef);
            // console.log('Updated column props due to changes', columnProps.value);
        }
    },
    unmounted(el: any) {
        // 清理所有事件监听器
        if (el._tableEventHandlers) {
            // 批量清理所有注册的事件
            if (el._tableEventHandlers?.events) {
                el._tableEventHandlers.events.forEach(({ element, type, handler }) => {
                    if (element) {
                        element.removeEventListener(type, handler);
                    }
                });
                delete el._tableEventHandlers;
            }
            // // 通过事件委托方式移除所有绑定的事件监听器
            // el.removeEventListener('click', el._tableEventHandlers.handleMouseEvent);
            // el.removeEventListener('mousedown', el._tableEventHandlers.handleMouseEvent);
            // el.removeEventListener('mousemove', el._tableEventHandlers.handleMouseEvent);
            // el.removeEventListener('mouseup', el._tableEventHandlers.handleMouseEvent);
            // el.removeEventListener('contextmenu', el._tableEventHandlers.handleMouseEvent);

            // // 清理角点拖动事件
            // if (el._cellOverlay?.corner) {
            //     el._cellOverlay.corner.removeEventListener('mousedown', el._tableEventHandlers.onCornerMouseDown);
            //     el._cellOverlay.corner.removeEventListener('mousemove', el._tableEventHandlers.onCornerMouseMove);
            //     el._cellOverlay.corner.removeEventListener('mouseup', el._tableEventHandlers.onCornerMouseUp);

            // }

            // // 清理全局事件
            // window.removeEventListener('keydown', el._tableEventHandlers.handleKeyDown);

            // 清理引用
            delete el._tableEventHandlers;
        }

        // 清理菜单相关元素
        if (el._cellOverlay) {
            // 移除所有创建的 DOM 元素
            if (el._cellOverlay.menu) el._cellOverlay.menu.remove();
            if (el._cellOverlay.overlay) el._cellOverlay.overlay.remove();

            // 清理引用
            delete el._cellOverlay;
        }

        // 清理其他引用
        // delete el._initialBinding;
        // delete el._tableData;
        // delete el._menuActions;
        // delete el._contextMenu;
        // delete el._selArea;
        // delete el._selectionRect;

        // 清理所有其他引用
        ['_initialBinding', '_tableData', '_menuActions', '_contextMenu',
            '_selArea', '_selectionRect'].forEach(prop => {
                if (el[prop] !== undefined) {
                    delete el[prop];
                }
            });
    }
}