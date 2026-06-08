package main

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	uploadsDir = "uploads"
	dbFile     = "data/data.json"
)

var (
	adminUser = getEnv("ADMIN_USER", "admin")
	adminPass = getEnv("ADMIN_PASS", "password")
	secretKey = []byte(getEnv("SECRET_KEY", "wecard-super-secure-key-2026"))
	dbMutex   sync.Mutex
)

type Card struct {
	ID        string `json:"id"`
	Slug      string `json:"slug"`
	WxID      string `json:"wxid"`
	QRCode    string `json:"qrcode"`
	IsDefault bool   `json:"is_default"`
}

type Database struct {
	Cards []Card `json:"cards"`
}

type Claims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

// Thread-safe Database reading
func readDb() (Database, error) {
	dbMutex.Lock()
	defer dbMutex.Unlock()

	dir := filepath.Dir(dbFile)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return Database{Cards: []Card{}}, err
	}

	if _, err := os.Stat(dbFile); os.IsNotExist(err) {
		db := Database{Cards: []Card{}}
		data, _ := json.MarshalIndent(db, "", "  ")
		_ = os.WriteFile(dbFile, data, 0644)
		return db, nil
	}

	data, err := os.ReadFile(dbFile)
	if err != nil {
		return Database{Cards: []Card{}}, err
	}

	var db Database
	if err := json.Unmarshal(data, &db); err != nil {
		return Database{Cards: []Card{}}, err
	}

	if db.Cards == nil {
		db.Cards = []Card{}
	}
	return db, nil
}

// Thread-safe Database writing
func writeDb(db Database) error {
	dbMutex.Lock()
	defer dbMutex.Unlock()

	data, err := json.MarshalIndent(db, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(dbFile, data, 0644)
}

// Unique UUIDv4 Generator (Standard format with 0 dependencies)
func generateUUID() string {
	b := make([]byte, 16)
	_, err := rand.Read(b)
	if err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

// HTTP Response Helpers
func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

// Auth Middleware wrapper
func requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("token")
		if err != nil {
			respondError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(cookie.Value, claims, func(token *jwt.Token) (interface{}, error) {
			return secretKey, nil
		})

		if err != nil || !token.Valid {
			respondError(w, http.StatusUnauthorized, "Invalid token")
			return
		}

		next(w, r)
	}
}

// --- Route Handlers ---

// POST /api/login
func handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Username == adminUser && req.Password == adminPass {
		expirationTime := time.Now().Add(7 * 24 * time.Hour)
		claims := &Claims{
			Username: req.Username,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(expirationTime),
			},
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenString, err := token.SignedString(secretKey)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Server error")
			return
		}

		http.SetCookie(w, &http.Cookie{
			Name:     "token",
			Value:    tokenString,
			Expires:  expirationTime,
			HttpOnly: true,
			Path:     "/",
			SameSite: http.SameSiteLaxMode,
		})

		respondJSON(w, http.StatusOK, map[string]bool{"success": true})
	} else {
		respondError(w, http.StatusUnauthorized, "Invalid credentials")
	}
}

// POST /api/logout
func handleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})

	respondJSON(w, http.StatusOK, map[string]bool{"success": true})
}

// GET /api/auth/session
func handleSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	cookie, err := r.Cookie("token")
	if err != nil {
		respondJSON(w, http.StatusOK, map[string]bool{"authenticated": false})
		return
	}

	claims := &Claims{}
	token, err := jwt.ParseWithClaims(cookie.Value, claims, func(token *jwt.Token) (interface{}, error) {
		return secretKey, nil
	})

	if err != nil || !token.Valid {
		respondJSON(w, http.StatusOK, map[string]bool{"authenticated": false})
		return
	}

	respondJSON(w, http.StatusOK, map[string]bool{"authenticated": true})
}

// GET /api/cards
func handleGetCards(w http.ResponseWriter, r *http.Request) {
	db, err := readDb()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to read database")
		return
	}
	respondJSON(w, http.StatusOK, db.Cards)
}

// POST /api/cards
func handleCreateCard(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// 10 MB limit
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid multipart form data")
		return
	}

	wxid := r.FormValue("wxid")
	slug := strings.TrimSpace(r.FormValue("slug"))
	isDefaultVal := r.FormValue("is_default")

	file, header, err := r.FormFile("file")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Image required")
		return
	}
	defer file.Close()

	if wxid == "" {
		respondError(w, http.StatusBadRequest, "Wechat ID required")
		return
	}

	if slug == "" {
		slug = generateUUID()[:6]
	}

	reservedSlugs := []string{"login", "admin", "api", "uploads", "assets", "k"}
	for _, resSlug := range reservedSlugs {
		if strings.ToLower(slug) == resSlug {
			respondError(w, http.StatusBadRequest, "Reserved URL suffix")
			return
		}
	}

	db, err := readDb()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to read database")
		return
	}

	for _, card := range db.Cards {
		if card.Slug == slug {
			respondError(w, http.StatusBadRequest, "Slug already exists")
			return
		}
	}

	isDefault := isDefaultVal == "true"
	if len(db.Cards) == 0 {
		isDefault = true
	}

	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create uploads directory")
		return
	}

	ext := filepath.Ext(header.Filename)
	filename := fmt.Sprintf("%s%s", generateUUID(), ext)
	filePath := filepath.Join(uploadsDir, filename)

	out, err := os.Create(filePath)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create physical file")
		return
	}
	defer out.Close()

	if _, err := io.Copy(out, file); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to save physical file")
		return
	}

	if isDefault {
		for i := range db.Cards {
			db.Cards[i].IsDefault = false
		}
	}

	newCard := Card{
		ID:        generateUUID(),
		Slug:      slug,
		WxID:      wxid,
		QRCode:    filename,
		IsDefault: isDefault,
	}

	db.Cards = append(db.Cards, newCard)
	if err := writeDb(db); err != nil {
		_ = os.Remove(filePath) // Cleanup original if DB write fails
		respondError(w, http.StatusInternalServerError, "Failed to persist card")
		return
	}

	respondJSON(w, http.StatusOK, newCard)
}

// DELETE /api/cards/:id
func handleDeleteCard(w http.ResponseWriter, r *http.Request, id string) {
	db, err := readDb()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to read database")
		return
	}

	var target *Card
	for _, card := range db.Cards {
		if card.ID == id {
			c := card
			target = &c
			break
		}
	}

	if target != nil {
		filePath := filepath.Join(uploadsDir, target.QRCode)
		if _, err := os.Stat(filePath); err == nil {
			_ = os.Remove(filePath)
		}

		newCards := []Card{}
		for _, card := range db.Cards {
			if card.ID != id {
				newCards = append(newCards, card)
			}
		}

		db.Cards = newCards

		if target.IsDefault && len(db.Cards) > 0 {
			db.Cards[0].IsDefault = true
		}

		if err := writeDb(db); err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to save database")
			return
		}
	}

	respondJSON(w, http.StatusOK, map[string]bool{"success": true})
}

// PATCH /api/cards/:id/default
func handleSetDefaultCard(w http.ResponseWriter, r *http.Request, id string) {
	db, err := readDb()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to read database")
		return
	}

	for i := range db.Cards {
		db.Cards[i].IsDefault = (db.Cards[i].ID == id)
	}

	if err := writeDb(db); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to save database")
		return
	}

	respondJSON(w, http.StatusOK, map[string]bool{"success": true})
}

// GET /api/cards/default
func handleGetDefaultCard(w http.ResponseWriter, r *http.Request) {
	db, err := readDb()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to read database")
		return
	}

	var defaultCard *Card
	for _, card := range db.Cards {
		if card.IsDefault {
			c := card
			defaultCard = &c
			break
		}
	}

	if defaultCard == nil && len(db.Cards) > 0 {
		c := db.Cards[0]
		defaultCard = &c
	}

	if defaultCard != nil {
		respondJSON(w, http.StatusOK, defaultCard)
	} else {
		respondError(w, http.StatusNotFound, "No default card found")
	}
}

// GET /api/cards/:slug
func handleGetCardBySlug(w http.ResponseWriter, r *http.Request, slug string) {
	db, err := readDb()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to read database")
		return
	}

	var foundCard *Card
	for _, card := range db.Cards {
		if card.Slug == slug {
			c := card
			foundCard = &c
			break
		}
	}

	if foundCard != nil {
		respondJSON(w, http.StatusOK, foundCard)
	} else {
		respondError(w, http.StatusNotFound, "Card not found")
	}
}

// Core API Gateway Router
func apiHandler(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	if path == "/api/login" {
		handleLogin(w, r)
		return
	}

	if path == "/api/logout" {
		handleLogout(w, r)
		return
	}

	if path == "/api/auth/session" {
		handleSession(w, r)
		return
	}

	if path == "/api/cards/default" {
		handleGetDefaultCard(w, r)
		return
	}

	if path == "/api/cards" && r.Method == http.MethodGet {
		handleGetCards(w, r)
		return
	}

	if path == "/api/cards" && r.Method == http.MethodPost {
		requireAuth(handleCreateCard)(w, r)
		return
	}

	if strings.HasPrefix(path, "/api/cards/") && r.Method == http.MethodDelete {
		id := strings.TrimPrefix(path, "/api/cards/")
		requireAuth(func(w http.ResponseWriter, r *http.Request) {
			handleDeleteCard(w, r, id)
		})(w, r)
		return
	}

	if strings.HasPrefix(path, "/api/cards/") && strings.HasSuffix(path, "/default") && r.Method == http.MethodPatch {
		id := strings.TrimPrefix(path, "/api/cards/")
		id = strings.TrimSuffix(id, "/default")
		requireAuth(func(w http.ResponseWriter, r *http.Request) {
			handleSetDefaultCard(w, r, id)
		})(w, r)
		return
	}

	if strings.HasPrefix(path, "/api/cards/") && r.Method == http.MethodGet {
		slug := strings.TrimPrefix(path, "/api/cards/")
		handleGetCardBySlug(w, r, slug)
		return
	}

	respondError(w, http.StatusNotFound, "API endpoint not found")
}

// Router & Static Files / SPA Fallback Handler
func serveStaticOrSPA(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	// 1. Static Uploads
	if strings.HasPrefix(path, "/uploads/") {
		filePath := filepath.Join(uploadsDir, strings.TrimPrefix(path, "/uploads/"))
		http.ServeFile(w, r, filePath)
		return
	}

	// 2. Direct paths or standard spa fallback
	distDir := "dist"
	targetPath := filepath.Join(distDir, path)

	// Clean path to prevent directory traversal
	targetPath = filepath.Clean(targetPath)
	if !strings.HasPrefix(targetPath, distDir) {
		http.ServeFile(w, r, filepath.Join(distDir, "index.html"))
		return
	}

	info, err := os.Stat(targetPath)
	if err == nil && !info.IsDir() {
		http.ServeFile(w, r, targetPath)
	} else {
		http.ServeFile(w, r, filepath.Join(distDir, "index.html"))
	}
}

func main() {
	_ = os.MkdirAll(uploadsDir, 0755)
	_ = os.MkdirAll(filepath.Dir(dbFile), 0755)

	http.HandleFunc("/api/", apiHandler)
	http.HandleFunc("/", serveStaticOrSPA)

	port := getEnv("PORT", "3000")
	log.Printf("Server running in Go on http://0.0.0.0:%s", port)
	if err := http.ListenAndServe("0.0.0.0:"+port, nil); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
