import { ListingGalleryImage } from "@/components/listing-image-gallery/utils/types";
import carUtilities1 from "@/images/carUtilities/1.png";
import carUtilities2 from "@/images/carUtilities/2.png";
import carUtilities3 from "@/images/carUtilities/3.png";
import carUtilities4 from "@/images/carUtilities/4.png";
import carUtilities5 from "@/images/carUtilities/5.png";
import carUtilities6 from "@/images/carUtilities/6.png";
import carUtilities7 from "@/images/carUtilities/7.png";
import carUtilities8 from "@/images/carUtilities/8.png";

export const PHOTOS: string[] = [
  "https://images.pexels.com/photos/6129967/pexels-photo-6129967.jpeg?auto=compress&cs=tinysrgb&dpr=3&h=750&w=1260",
  "https://images.pexels.com/photos/7163619/pexels-photo-7163619.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260",
  "https://images.pexels.com/photos/6527036/pexels-photo-6527036.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260",
  "https://images.pexels.com/photos/6969831/pexels-photo-6969831.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260",
  "https://images.pexels.com/photos/6438752/pexels-photo-6438752.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260",
  "https://images.pexels.com/photos/1320686/pexels-photo-1320686.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260",
  "https://images.pexels.com/photos/261394/pexels-photo-261394.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260",
  "https://images.pexels.com/photos/2861361/pexels-photo-2861361.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260",
  "https://images.pexels.com/photos/2677398/pexels-photo-2677398.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260",
  "https://images.pexels.com/photos/1365425/pexels-photo-1365425.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/914128/pexels-photo-914128.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/840667/pexels-photo-840667.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/732632/pexels-photo-732632.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/450062/pexels-photo-450062.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/917510/pexels-photo-917510.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/1194233/pexels-photo-1194233.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/236973/pexels-photo-236973.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/1392099/pexels-photo-1392099.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/547116/pexels-photo-547116.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/1002272/pexels-photo-1002272.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/917511/pexels-photo-917511.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/771079/pexels-photo-771079.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/13461077/pexels-photo-13461077.jpeg?auto=compress&cs=tinysrgb&w=1600&lazy=load",
  "https://images.pexels.com/photos/9074921/pexels-photo-9074921.jpeg?auto=compress&cs=tinysrgb&w=1600&lazy=load",
  "https://images.pexels.com/photos/9336042/pexels-photo-9336042.jpeg?auto=compress&cs=tinysrgb&w=1600&lazy=load",
  "https://images.pexels.com/photos/5418318/pexels-photo-5418318.jpeg?auto=compress&cs=tinysrgb&w=1600&lazy=load",
  "https://images.pexels.com/photos/4815278/pexels-photo-4815278.jpeg?auto=compress&cs=tinysrgb&w=1600&lazy=load",
  "https://images.pexels.com/photos/1365425/pexels-photo-1365425.jpeg?auto=compress&cs=tinysrgb&w=1600",
];

export const Amenities_demos = [
  { name: "SightSeeing", icon: carUtilities1 },
  {
    name: "Meals",
    icon: carUtilities2,
  },
  { name: "Visa", icon: carUtilities3 },
  { name: "Laundry", icon: carUtilities4 },
  {
    name: "Makkah Tower 1 or similler hotel in Makkah (~300m)",
    icon: carUtilities5,
  },
  { name: "Ajyad hotel in Madina (~400m)", icon: carUtilities6 },
  { name: "Makkah stay 10 Days", icon: carUtilities7 },
  { name: "Madina stay 8 Days", icon: carUtilities8 },
];
export const imageGallery: ListingGalleryImage[] = [...PHOTOS].map(
  (item, index): ListingGalleryImage => {
    return {
      id: index,
      url: item,
    };
  }
);
