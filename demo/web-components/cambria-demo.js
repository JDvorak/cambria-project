require('./cambria-document')
require('./cambria-lens')

class CambriaDemo extends HTMLElement {
  template = document.createElement('template')

  constructor() {
    super()

    this.template.innerHTML = `
      <style>
        :host {
          display: grid;
          grid-template-columns: 40% 30% 40%;
          grid-template-rows: auto;
          grid-template-areas:
            ' left lens right '
            ' patch patch patch '
            ' error error error ';
          grid-gap: 4px;
        }

        .left {
          grid-area: left;
          --color: blue;
        }

        .lens {
          grid-area: lens;
          --color: black;
        }

        .right {
          grid-area: right;
          --color: green;
        }

        .error {
          grid-area: error;
          --color: red;
          font-family: monospace;
        }

        .patch {
          grid-area: patch;
          --color: grey;
          font-family: monospace;
        }

        .thumb {
          background-color: var(--color);
          color: white;
          text-size: 10px;
          border-radius: 2px;
        }

        .block {
          border: 2px solid var(--color);
        }

        .schema {  border: 1px solid black; }
        
      </style>
      <div class="left block">
        <div class="thumb">Left Document</div>
        <slot name="left"></slot>
        <pre class="schema"/>
      </div>
      <div class="lens block">
        <div class="thumb">Lens</div>
        <slot name="lens"></slot></div>
      </div>
      <div class="right block">
        <div class="thumb">Right Document</div>
        <slot name="right"></slot>
        <pre class="schema"/>
      </div>

      <div class="patch block">
        <div class="thumb">Last Patch</div>
        <pre class="content">... no activity ...</pre>
      </div>
      
      <div class="error block">
        <div class="thumb">Last Error</div>
        <span class="content">... no errors yet ...</span>
      </div>`

    // Create a shadow root
    const shadow = this.attachShadow({ mode: 'open' })

    const result = this.template.content.cloneNode(true)
    shadow.appendChild(result)

    this.error = shadow.querySelector('.error .content')
    this.patch = shadow.querySelector('.patch .content')

    const slots = {}
    shadow.querySelectorAll('slot').forEach((slot) => {
      slots[slot.name] = slot.assignedElements()[0] || slot.firstElementChild
    })

    this.left = slots.left

    this.leftSchema = shadow.querySelector('.left .schema')
    this.rightSchema = shadow.querySelector('.right .schema')

    this.right = slots.right
    this.lens = slots.lens

    slots.lens.addEventListener('lens-changed', (e) => {
      // trigger a re-processing of the document
      this.right.clear()
      this.left.importDoc()
    })

    // ehhhhhh
    slots.left.addEventListener('doc-change', (e) => {
      this.leftSchema.innerText = JSON.stringify(e.detail.schema, null, 2)
      slots.lens.dispatchEvent(
        new CustomEvent('doc-change', { detail: { ...e.detail, destination: slots.right } })
      )
    })

    slots.right.addEventListener('doc-change', (e) => {
      this.rightSchema.innerText = JSON.stringify(e.detail.schema, null, 2)
      slots.lens.dispatchEvent(
        new CustomEvent('doc-change', {
          detail: { ...e.detail, reverse: true, destination: slots.left },
        })
      )
    })

    // hack
    Object.values(slots).forEach((slot) =>
      slot.addEventListener('cloudina-error', (e) => {
        this.error.innerText = `${e.detail.topic}: ${e.detail.message}`
      })
    )

    slots.lens.addEventListener('doc-patch', (e) => {
      const { detail } = e
      const { patch, destination } = e.detail
      this.patch.innerText = JSON.stringify(patch, null, 2)

      if (destination === slots.left) {
        this.leftSchema.innerText = JSON.stringify(e.detail.schema, null, 2)
      } else if (destination === slots.right) {
        this.rightSchema.innerText = JSON.stringify(e.detail.schema, null, 2)
      }
      destination.dispatchEvent(new CustomEvent('doc-patch', { detail }))
    })

    this.left.importDoc()
  }
}

// Define the new element
customElements.define('cambria-demo', CambriaDemo)
