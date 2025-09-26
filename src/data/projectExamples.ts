export const projectExamples = [
  "4 bedroom modern house with swimming pool and garden",
  "2 bedroom heritage house renovation with modern bathroom", 
  "3 bedroom family home with indoor pool and garage",
  "2 bedroom Scandinavian house with zen garden",
  "15 apartment residential development with parking",
  "4 bedroom house with open kitchen and outdoor deck",
  "3 bedroom heritage renovation with luxury bathrooms",
  "3 bedroom house with rooftop terrace and city views",
  "8 unit apartment complex with shared courtyard",
  "5 bedroom luxury estate with pool and tennis court",
  "2 bedroom Victorian cottage restoration",
  "6 apartment building with mixed layouts",
  "3 bedroom townhouse with garage and rooftop garden",
  "20 unit residential complex with amenities",
  "4 bedroom custom home with outdoor kitchen",
  "2 bedroom house extension to 3 bedrooms",
  "2 unit duplex with private courtyards",
  "3 bedroom eco-home with solar and garden",
  "6 bedroom estate with guest house and helipad",
  "2 bedroom warehouse loft conversion"
];

export const getRandomExamples = (count: number = 3) => {
  const shuffled = [...projectExamples].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};