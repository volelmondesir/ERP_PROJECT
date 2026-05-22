import jwt from "jsonwebtoken";

const SECRET = "mysecretkey";

export const authMiddleware = (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);

    req.user = decoded; 
    next();  // Proceed to next route
  } catch (err) {
    console.error("JWT ERROR:", err.message);
    res.status(400).json({ message: "Invalid token" });
  }
};