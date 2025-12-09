<script lang="ts">
  type Props = {
    linkedRadius: boolean
    onLinkedRadiusChange: (value: boolean) => void
    onSetLinearRadii: () => void
  }

  let { linkedRadius, onLinkedRadiusChange, onSetLinearRadii }: Props = $props()
</script>

<div class="flex flex-row gap-6 items-center justify-center">
  <label class="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={linkedRadius}
      onchange={(e) =>
        onLinkedRadiusChange((e.target as HTMLInputElement).checked)}
    />
    <span>Link all radius sliders</span>
  </label>
  <button
    class="bg-blue-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-300 transition-colors"
    onclick={onSetLinearRadii}
  >
    Set linear radii
  </button>
</div>
