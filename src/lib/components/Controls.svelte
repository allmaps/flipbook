<script lang="ts">
  type Props = {
    radius: number
    disabled?: boolean
    ondelete: () => void
  }

  let { radius = $bindable(), ondelete, disabled = false }: Props = $props()
  const uid = $props.id()

  const minRadius = 100 // 100 meters
  const maxRadius = 50000 // 50 km
  const minLog = Math.log(minRadius)
  const maxLog = Math.log(maxRadius)

  // Convert radius to logarithmic slider value
  function radiusToSliderValue(radius: number): number {
    return ((Math.log(radius) - minLog) / (maxLog - minLog)) * 100
  }

  // Convert logarithmic slider value to radius
  function sliderValueToRadius(value: number): number {
    return Math.round(Math.exp(minLog + (value / 100) * (maxLog - minLog)))
  }

  let sliderValue = $state(radiusToSliderValue(radius))

  function handleChange(event: Event) {
    const target = event.target as HTMLInputElement
    sliderValue = parseFloat(target.value)
    radius = sliderValueToRadius(sliderValue)
  }

  // Update slider value when radius changes externally
  $effect(() => {
    sliderValue = radiusToSliderValue(radius)
  })
</script>

<div class="flex flex-row items-center justify-between gap-2">
  <input
    class="w-full"
    id={uid}
    type="range"
    min="0"
    max="100"
    step="0.1"
    value={sliderValue}
    {disabled}
    onchange={handleChange}
  />
  <label for={uid} class="whitespace-nowrap"
    >{radius >= 1000
      ? `${(radius / 1000).toFixed(1)} km`
      : `${radius} m`}</label
  >
  <button
    onclick={ondelete}
    {disabled}
    class="bg-red-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-red-300 transition-colors"
  >
    Delete
  </button>
</div>
