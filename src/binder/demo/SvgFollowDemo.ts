import { defineComponent, h, ref, computed, toRef, PropType } from 'vue'
import type { Placement } from '../src/interface'
import { useFollow } from '../src/useFollow'

type Strategy = 'fixed' | 'absolute'

type SyncTrigger = Array<'scroll' | 'resize'>

export default defineComponent({
  name: 'SvgFollowDemo',
  props: {
    show: Boolean,
    scrollMode: {
      type: String as PropType<'document' | 'nested'>,
      default: 'document'
    },
    placement: {
      type: String as PropType<Placement>,
      default: 'bottom'
    },
    strategy: {
      type: String as PropType<Strategy>,
      default: 'fixed'
    },
    syncTrigger: {
      type: Array as PropType<SyncTrigger>,
      default: () => ['scroll', 'resize']
    },
    flip: Boolean,
    internalShift: Boolean,
    overlap: Boolean,
    useTargetWidth: Boolean,
    x: Number,
    y: Number,
    zIndex: Number
  },
  setup (props) {
    const documentCircleRef = ref<SVGCircleElement | null>(null)
    const nestedCircleRef = ref<SVGCircleElement | null>(null)
    const tooltipRef = ref<HTMLParagraphElement | null>(null)
    const enabledRef = computed(() => !!props.show)
    const widthRef = computed(() => (props.useTargetWidth ? 'target' : undefined))
    const activeTargetRef = computed<Element | null>(() =>
      props.scrollMode === 'nested'
        ? nestedCircleRef.value
        : documentCircleRef.value
    )
    const { floatingStyles: circleTipStyles } = useFollow({
      targetRef: activeTargetRef,
      followerRef: tooltipRef,
      enabledRef,
      placement: toRef(props, 'placement'),
      strategy: toRef(props, 'strategy'),
      syncTrigger: toRef(props, 'syncTrigger'),
      flip: toRef(props, 'flip'),
      internalShift: toRef(props, 'internalShift'),
      overlap: toRef(props, 'overlap'),
      width: widthRef,
      x: toRef(props, 'x'),
      y: toRef(props, 'y'),
      zIndex: toRef(props, 'zIndex')
    })

    const renderDocumentScene = () => h('div', {
      style: {
        width: '100%',
        border: '1px solid #d5eede',
        borderRadius: '12px',
        backgroundColor: '#f7fffb',
        padding: '24px',
        boxShadow: 'inset 0 1px 0 rgba(66, 184, 131, 0.15)'
      }
    }, [
      h('p', {
        style: {
          margin: '0 0 16px',
          color: '#2f3331',
          fontWeight: 500
        }
      }, 'Document scroll · Scroll the page to move the circle'),
      h('div', { style: { height: '520px' } }),
      h('div', {
        style: {
          display: 'flex',
          justifyContent: 'center'
        }
      }, [
        h('svg', {
          width: 600,
          height: 400,
          style: {
            border: '1px dashed #42b883',
            borderRadius: '8px',
            backgroundColor: '#f9fffc'
          }
        }, [
          h('circle', {
            ref: documentCircleRef,
            cx: 300,
            cy: 60,
            r: 20,
            fill: '#42b883'
          })
        ])
      ]),
      h('div', { style: { height: '700px' } })
    ])

    const renderNestedScene = () => h('div', {
      style: {
        width: '100%',
        border: '1px solid #d5eede',
        borderRadius: '12px',
        backgroundColor: '#ffffff',
        padding: '24px',
        boxShadow: 'inset 0 1px 0 rgba(66, 184, 131, 0.15)'
      }
    }, [
      h('p', {
        style: {
          margin: '0 0 16px',
          color: '#2f3331',
          fontWeight: 500
        }
      }, 'Nested scroll · Scroll inside the container below'),
      h('div', {
        style: {
          height: '420px',
          border: '1px dashed #42b883',
          borderRadius: '10px',
          overflow: 'auto',
          backgroundColor: '#f9fffc'
        }
      }, [
        h('div', {
          style: {
            height: '1400px',
            padding: '40px 24px',
            display: 'flex',
            justifyContent: 'center'
          }
        }, [
          h('div', {
            style: {
              marginTop: '640px'
            }
          }, [
            h('svg', {
              width: 600,
              height: 400,
              style: {
                border: '1px dashed #42b883',
                borderRadius: '8px',
                backgroundColor: '#f9fffc'
              }
            }, [
              h('circle', {
                ref: nestedCircleRef,
                cx: 180,
                cy: 320,
                r: 20,
                fill: '#42b883'
              })
            ])
          ])
        ])
      ])
    ])

    return () =>
      h('div', {
        style: {
          marginTop: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          alignItems: 'stretch'
        }
      }, [
        props.scrollMode === 'nested'
          ? renderNestedScene()
          : renderDocumentScene(),
        props.show
          ? h('p', {
            ref: tooltipRef,
            style: [
              circleTipStyles.value,
              {
                margin: 0,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid black',
                backgroundColor: 'rgba(0,0,0, 0.1)',
                color: '#2f3331',
                boxShadow: '0 12px 32px rgba(66, 184, 131, 0.15)',
                fontWeight: 500
              }
            ]
          }, ['This is a circleTip!'])
          : null
      ])
  }
})
