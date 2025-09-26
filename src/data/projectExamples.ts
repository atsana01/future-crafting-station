export const projectExamples = [
  "4 bedroom modern house with 3 full bathrooms, landscaped garden, and 25m swimming pool",
  "Complete renovation of 2 bedrooms and 1 bathroom in 1920s heritage house", 
  "Large contemporary family home: 3 bedrooms, 2 ensuite bathrooms, indoor lap pool, double garage",
  "Minimalist Scandinavian house with 2 bedrooms, 1 designer bathroom, Japanese zen garden",
  "Residential development: 15 single-bedroom apartments with underground parking and communal facilities",
  "Modern family home with 4 bedrooms, 3 bathrooms, open-plan kitchen, and outdoor entertaining deck",
  "Heritage house renovation: modernize 3 bedrooms, completely rebuild 2 bathrooms with luxury fittings",
  "Contemporary 3-bedroom house with 2 bathrooms, rooftop terrace, and city skyline views",
  "Boutique apartment complex: 8 units with 2 bedrooms each, shared courtyard and BBQ area",
  "Luxury family estate with 5 bedrooms, 4 ensuite bathrooms, infinity pool, spa, and tennis court",
  "Complete restoration of Victorian cottage: 2 bedrooms, 1 period bathroom, heritage garden features",
  "Multi-story residential building: 6 apartments mixing studios, one and two-bedroom layouts",
  "Modern townhouse with 3 bedrooms, 3 bathrooms, private double garage, and rooftop garden",
  "Urban residential complex featuring 20 studio and 1-bedroom apartments with shared amenities",
  "Architect-designed custom home: 4 bedrooms, 3 bathrooms, outdoor kitchen and entertainment pavilion",
  "House extension project: expand existing 2-bedroom home to 3 bedrooms with 2 modern bathrooms",
  "Investment duplex property: 2 identical units, each with 2 bedrooms, 2 bathrooms, and private courtyards",
  "Sustainable eco-home with 3 bedrooms, 2 bathrooms, solar panels, rainwater harvesting, and permaculture garden",
  "Prestige family estate: 6 bedrooms, 5 bathrooms, separate guest house, infinity pool, and helicopter pad",
  "Industrial loft conversion: transform warehouse into 2 bedroom, 2 bathroom urban residence with mezzanine"
];

export const getRandomExamples = (count: number = 3) => {
  const shuffled = [...projectExamples].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};