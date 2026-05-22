import jwt from "jsonwebtoken";

const SECRET = "your_secret_key";

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ message: "No token ❌" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET);

    // 🔥 ajoute user nan request
    req.user = decoded;

    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token ❌" });
  }
};
