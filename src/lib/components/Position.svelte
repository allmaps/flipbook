<script lang="ts">
  import { GpsFix as GpsFixIcon } from 'phosphor-svelte'

  type Props = {
    center: [number, number]
    onCenterChange: (center: [number, number]) => void
  }

  let { center, onCenterChange }: Props = $props()

  let inputValue = $state(`${center[0]}, ${center[1]}`)

  function handleChange(event: Event) {
    const target = event.target as HTMLInputElement
    const value = target.value.trim()

    // Parse the input as "lat, lon"
    const parts = value.split(',').map((part) => parseFloat(part.trim()))

    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      onCenterChange([parts[0], parts[1]])
    }
  }

  function handleGetCurrentPosition() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCenter: [number, number] = [
            position.coords.latitude,
            position.coords.longitude
          ]
          onCenterChange(newCenter)
        },
        (error) => {
          console.error('Error getting position:', error)
          alert('Could not get your current position. Please check your browser permissions.')
        }
      )
    } else {
      alert('Geolocation is not supported by your browser.')
    }
  }

  // Update input when center changes externally
  $effect(() => {
    inputValue = `${center[0]}, ${center[1]}`
  })
</script>

<div class="flex flex-row items-center gap-4 w-full max-w-2xl">
  <label for="position">Position (lat, lon):</label>
  <input
    id="position"
    type="text"
    bind:value={inputValue}
    onchange={handleChange}
    class="flex-1 px-3 py-2 border border-gray-300 rounded"
    placeholder="52.37278, 4.90035"
  />
  <button
    onclick={handleGetCurrentPosition}
    class="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
    title="Get current position"
  >
    <GpsFixIcon size={20} />
  </button>
</div>
