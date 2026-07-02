// Hands the picked map location back to the screen that opened the picker.
// Router params can't be used for this: since expo-router v4, router.navigate
// pushes a new screen instead of returning to the existing one, which would
// discard everything the user already typed.
export interface PickedLocation {
  lat: number;
  lng: number;
  placeName: string;
}

let pickedLocation: PickedLocation | null = null;

export function setPickedLocation(loc: PickedLocation) {
  pickedLocation = loc;
}

export function consumePickedLocation(): PickedLocation | null {
  const loc = pickedLocation;
  pickedLocation = null;
  return loc;
}
