CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price NUMERIC NOT NULL CHECK (price >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO productos (name, price) VALUES
    ('Notebook', 1500),
    ('Mouse', 20),
    ('Keyboard', 50);
