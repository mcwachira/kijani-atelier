import { createFileRoute , Link} from '@tanstack/react-router'
import hero from "@/assets/hero.jpg"
import craft from "@/assets/craft.jpg"
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head:() => ({
    meta:[
      { title: "Kijani Atelier — Handcrafted for the Modern Woman" },
      {
        name: "description",
        content:
          "Handmade leather and beaded sandals, kiondos, woven handbags and artisan accessories, made in small batches by women artisans in Kenya.",
      },
      { property: "og:title", content: "Kijani Atelier — Handcrafted for the Modern Woman" },
      {
        property: "og:description",
        content: "Leather sandals, kiondos and woven bags made by hand in Kenya.",
      },
    ],

  }),
  component:HomePage,
})



const testimonials = [
  {
    quote:
      "I've worn my Amani slides through two Nairobi seasons and they've only got better. The leather moulds to your foot.",
    name: "Wanjiru K.",
    city: "Nairobi",
  },
  {
    quote: "The kiondo arrived beautifully wrapped. It's the piece everyone asks about when I travel.",
    name: "Leila H.",
    city: "Mombasa",
  },
  {
    quote: "Elegant without shouting. You can feel the hours in the weave.",
    name: "Grace N.",
    city: "Kisumu",
  },
];
function HomePage() {

  // const {data:categories} = useQuery(categoriesQuery())
  return (
 <div>

    <h1>
    Hello world from tanstack </h1></div>
  )
}
