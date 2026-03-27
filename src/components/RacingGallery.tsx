import { useState } from "react";
import { X, Camera } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Import the racing car images
import racingHero from "@/assets/racing-hero.jpg";
import gt3Car from "@/assets/gt3-car.jpg";
import formulaCar from "@/assets/formula-car.jpg";
import porscheGt2 from "@/assets/porsche-gt2.jpg";
import mclarenGt3 from "@/assets/mclaren-gt3.jpg";
import racingGrid from "@/assets/racing-grid.jpg";
import bmwGt4 from "@/assets/bmw-gt4.jpg";
import racingCockpit from "@/assets/racing-cockpit.jpg";

interface RacingImage {
  id: string;
  src: string;
  alt: string;
  category: "GT" | "Formula" | "Cockpit" | "Track";
}

const racingImages: RacingImage[] = [
  { id: "1", src: racingHero, alt: "Racing Dashboard View", category: "Cockpit" },
  { id: "2", src: gt3Car, alt: "GT3 Race Car", category: "GT" },
  { id: "3", src: formulaCar, alt: "Formula 1 Car", category: "Formula" },
  { id: "4", src: porscheGt2, alt: "Porsche GT2 RS", category: "GT" },
  { id: "5", src: mclarenGt3, alt: "McLaren GT3", category: "GT" },
  { id: "6", src: racingGrid, alt: "Racing Grid", category: "Track" },
  { id: "7", src: bmwGt4, alt: "BMW M4 GT4", category: "GT" },
  { id: "8", src: racingCockpit, alt: "Racing Cockpit", category: "Cockpit" },
];

interface RacingGalleryProps {
  onClose?: () => void;
}

const RacingGallery = ({ onClose }: RacingGalleryProps) => {
  const [selectedImage, setSelectedImage] = useState<RacingImage | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = ["All", "GT", "Formula", "Cockpit", "Track"];

  const filteredImages = selectedCategory === "All" 
    ? racingImages 
    : racingImages.filter(img => img.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-dark p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Camera className="text-primary" />
            Racing Gallery
          </h1>
          <p className="text-muted-foreground text-sm">GT Cars & Race Car Collection</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "pulse" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className="whitespace-nowrap"
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {filteredImages.map((image) => (
          <Card
            key={image.id}
            className="bg-gradient-dark border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-racing cursor-pointer overflow-hidden"
            onClick={() => setSelectedImage(image)}
          >
            <CardContent className="p-0">
              <div className="aspect-square relative overflow-hidden">
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-2 left-2 right-2 opacity-0 hover:opacity-100 transition-opacity duration-300">
                  <p className="text-xs font-medium text-foreground">{image.alt}</p>
                  <p className="text-xs text-racing-orange">{image.category}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 z-10 bg-background/50 backdrop-blur-sm"
              onClick={() => setSelectedImage(null)}
            >
              <X size={20} />
            </Button>
            <img
              src={selectedImage.src}
              alt={selectedImage.alt}
              className="w-full h-full object-contain rounded-lg"
            />
            <div className="absolute bottom-4 left-4 right-4 bg-background/80 backdrop-blur-sm rounded-lg p-3">
              <h3 className="font-bold text-foreground">{selectedImage.alt}</h3>
              <p className="text-sm text-racing-orange">{selectedImage.category} Category</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RacingGallery;