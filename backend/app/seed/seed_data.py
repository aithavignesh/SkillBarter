import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.skill import Skill, UserSkill
from app.models.exchange import Exchange
from app.models.review import Review
from app.models.connection import Connection
from app.models.post import Post
from app.models.message import Message
from app.models.notification import Notification
from app.services.auth import hash_password

def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).filter(User.email == "arjun@skillbarter.com").first():
            print("Database already contains seed data.")
            return

        print("Seeding SkillBarter catalog and demonstration dataset...")

        # 1. Seed Skills Catalog
        skills_data = [
            # Home Repair
            ("Plumbing", "Home Repair", "Wrench", "Pipe repairs, kitchen sink installation, bathroom leak fixes"),
            ("Carpentry", "Home Repair", "Hammer", "Furniture assembly, custom shelves, woodwork repairs"),
            ("Electrical Work", "Home Repair", "Zap", "Light fixtures, socket repair, wiring maintenance"),
            ("Painting", "Home Repair", "Paintbrush", "Interior wall painting, touchups, trim work"),
            ("Bike Repair", "Home Repair", "Bike", "Bicycle gear tuning, chain replacement, brake adjustments"),
            ("Gardening", "Home Repair", "Sprout", "Lawn maintenance, organic balcony garden setup, plant care"),
            
            # Technology
            ("Web Development", "Technology", "Code", "Full-stack web development, responsive landing pages, React"),
            ("Mobile App Dev", "Technology", "Smartphone", "iOS and Android apps with React Native & Flutter"),
            ("Python Tutoring", "Technology", "Terminal", "Backend programming, data automation, Python basics"),
            
            # Design
            ("UI Design", "Design", "Layout", "User interface design, Figma wireframes, modern web layouts"),
            ("Graphic Design", "Design", "Palette", "Vector illustrations, logos, social media banners"),
            
            # Photography
            ("Photography", "Photography", "Camera", "Portrait, event, product and landscape photography"),
            ("Video Editing", "Photography", "Video", "Cinematic color grading, Reels, YouTube editing"),
            
            # Cooking & Fitness
            ("Cooking", "Cooking", "Utensils", "Italian culinary basics, baking, artisanal sourdough"),
            ("Fitness & Yoga", "Fitness", "Heart", "Vinyasa yoga, core conditioning, home workout plans"),
        ]

        skill_records = {}
        for name, cat, icon, desc in skills_data:
            skill = Skill(name=name, category=cat, icon=icon, description=desc, popularity=10)
            db.add(skill)
            db.flush()
            skill_records[name] = skill

        # 2. Seed Users
        # Arjun Sharma (CEO Demo Requester)
        arjun = User(
            email="arjun@skillbarter.com",
            password_hash=hash_password("Password123!"),
            full_name="Arjun Sharma",
            headline="Web Developer & Photographer",
            bio="Frontend & full-stack software engineer passionate about modern web apps. Happy to build landing pages or teach coding in exchange for plumbing or woodwork!",
            address_display="Hitech City, Hyderabad",
            latitude=17.4485,
            longitude=78.3748,
            exchange_radius_km=10.0,
            availability="Weekends & Evenings",
            trust_score=94.0,
            reliability_score=95.0,
            response_rate=98.0,
            skill_quality_score=94.0,
            completed_exchanges_count=18,
            reviews_count=16,
            badges=["Verified Member", "Reliable Exchanger", "Top Contributor", "10+ Successful Exchanges"],
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
        )
        db.add(arjun)

        # Ravi Kumar (CEO Demo Partner - 1.8 km away)
        ravi = User(
            email="ravi@skillbarter.com",
            password_hash=hash_password("Password123!"),
            full_name="Ravi Kumar",
            headline="Master Plumber & Home Repair Specialist",
            bio="12+ years hands-on experience in residential plumbing, pipe fittings, and home repair. Looking to get a professional website and social branding built for my local services.",
            address_display="Madhapur, Hyderabad",
            latitude=17.4504,
            longitude=78.3882, # ~1.8 km from Arjun
            exchange_radius_km=10.0,
            availability="Weekends & Evenings",
            trust_score=94.0,
            reliability_score=96.0,
            response_rate=95.0,
            skill_quality_score=94.0,
            completed_exchanges_count=14,
            reviews_count=12,
            badges=["Verified Member", "Reliable Exchanger", "Top Contributor"],
            avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
        )
        db.add(ravi)

        # Ananya Rao (2.4 km away)
        ananya = User(
            email="ananya@skillbarter.com",
            password_hash=hash_password("Password123!"),
            full_name="Ananya Rao",
            headline="UI/UX Designer & Brand Strategist",
            bio="Product designer building seamless web & mobile experiences. Interested in exchanging branding or Figma UI design for portrait photography or gourmet cooking lessons.",
            address_display="Jubilee Hills, Hyderabad",
            latitude=17.4325,
            longitude=78.4072, # ~2.4 km from Arjun
            exchange_radius_km=8.0,
            availability="Flexible",
            trust_score=91.0,
            reliability_score=90.0,
            response_rate=92.0,
            skill_quality_score=93.0,
            completed_exchanges_count=9,
            reviews_count=8,
            badges=["Verified Member", "Reliable Exchanger"],
            avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80"
        )
        db.add(ananya)

        # Priya Sharma (3.1 km away)
        priya = User(
            email="priya@skillbarter.com",
            password_hash=hash_password("Password123!"),
            full_name="Priya Sharma",
            headline="Professional Photographer & Drone Pilot",
            bio="Commercial and portrait photographer with Sony Alpha kit and DJI drones. Looking for help with carpentry shelving or urban balcony gardening.",
            address_display="Banjara Hills, Hyderabad",
            latitude=17.4156,
            longitude=78.4350, # ~3.1 km from Arjun
            exchange_radius_km=12.0,
            availability="Weekends",
            trust_score=96.0,
            reliability_score=98.0,
            response_rate=96.0,
            skill_quality_score=97.0,
            completed_exchanges_count=22,
            reviews_count=20,
            badges=["Verified Member", "Reliable Exchanger", "Top Contributor", "Community Helper", "10+ Successful Exchanges"],
            avatar_url="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80"
        )
        db.add(priya)

        # Admin user
        admin = User(
            email="admin@skillbarter.com",
            password_hash=hash_password("AdminPassword123!"),
            full_name="SkillBarter Admin",
            headline="Community Safety & Operations",
            bio="Official SkillBarter community team ensuring safe, trustworthy neighborhood skill exchanges.",
            address_display="Hyderabad HQ",
            latitude=17.4485,
            longitude=78.3748,
            is_admin=True,
            trust_score=100.0,
            badges=["Verified Member", "Staff Admin"],
            avatar_url="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80"
        )
        db.add(admin)
        db.flush()

        # 3. User Skills
        # Arjun offers Web Development & Photography; needs Plumbing & Carpentry
        db.add(UserSkill(user_id=arjun.id, skill_id=skill_records["Web Development"].id, skill_type="OFFERED", experience_level="Expert", description="Full-stack responsive websites and portfolio design"))
        db.add(UserSkill(user_id=arjun.id, skill_id=skill_records["Photography"].id, skill_type="OFFERED", experience_level="Intermediate", description="Portrait & outdoor lifestyle photography"))
        db.add(UserSkill(user_id=arjun.id, skill_id=skill_records["UI Design"].id, skill_type="OFFERED", experience_level="Intermediate", description="Clean Figma mockups & prototypes"))
        db.add(UserSkill(user_id=arjun.id, skill_id=skill_records["Plumbing"].id, skill_type="NEEDED", experience_level="Beginner", description="Need help repairing kitchen faucet and leaky pipe"))
        db.add(UserSkill(user_id=arjun.id, skill_id=skill_records["Carpentry"].id, skill_type="NEEDED", experience_level="Beginner", description="Need help assembling wooden bookshelf"))

        # Ravi offers Plumbing & Home Repair; needs Web Development
        db.add(UserSkill(user_id=ravi.id, skill_id=skill_records["Plumbing"].id, skill_type="OFFERED", experience_level="Expert", description="Certified plumbing, pipe replacement, emergency faucet fixes"))
        db.add(UserSkill(user_id=ravi.id, skill_id=skill_records["Electrical Work"].id, skill_type="OFFERED", experience_level="Intermediate", description="Home fixture installations and switchboard wiring"))
        db.add(UserSkill(user_id=ravi.id, skill_id=skill_records["Web Development"].id, skill_type="NEEDED", experience_level="Beginner", description="Need a clean website to showcase my plumbing services locally"))

        # Ananya offers UI Design; needs Photography
        db.add(UserSkill(user_id=ananya.id, skill_id=skill_records["UI Design"].id, skill_type="OFFERED", experience_level="Expert", description="Modern app and web UI/UX, design systems"))
        db.add(UserSkill(user_id=ananya.id, skill_id=skill_records["Photography"].id, skill_type="NEEDED", experience_level="Beginner", description="Looking for professional product photography shots"))

        # Priya offers Photography; needs Carpentry
        db.add(UserSkill(user_id=priya.id, skill_id=skill_records["Photography"].id, skill_type="OFFERED", experience_level="Expert", description="Studio portraits, events, outdoor sessions"))
        db.add(UserSkill(user_id=priya.id, skill_id=skill_records["Carpentry"].id, skill_type="NEEDED", experience_level="Beginner", description="Custom display shelving for photo studio"))

        db.flush()

        # 4. Connections
        db.add(Connection(user_id=arjun.id, connected_user_id=ananya.id, status="ACCEPTED"))
        db.add(Connection(user_id=arjun.id, connected_user_id=priya.id, status="ACCEPTED"))
        db.add(Connection(user_id=ravi.id, connected_user_id=priya.id, status="ACCEPTED"))

        # 5. Completed Exchange History & Authentic Reviews
        past_ex = Exchange(
            requester_id=priya.id,
            receiver_id=arjun.id,
            requester_skill_id=skill_records["Photography"].id,
            receiver_skill_id=skill_records["Web Development"].id,
            status="COMPLETED",
            proposal_message="I would love portrait photos for my portfolio in exchange for building your personal portfolio site.",
            preferred_date="Last month",
            estimated_hours=3.0,
            location_area="Botanical Gardens, Hitech City",
            requester_completed=True,
            receiver_completed=True,
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=20),
            updated_at=datetime.datetime.utcnow() - datetime.timedelta(days=15)
        )
        db.add(past_ex)
        db.flush()

        # Mutual reviews for that completed barter
        db.add(Review(
            exchange_id=past_ex.id,
            reviewer_id=priya.id,
            reviewee_id=arjun.id,
            rating=5,
            reliability_score=5,
            skill_quality_score=5,
            would_exchange_again=True,
            comment="Arjun built an incredible portfolio website for my photography studio! Delivered clean code quickly and was a pleasure to trade skills with."
        ))
        db.add(Review(
            exchange_id=past_ex.id,
            reviewer_id=arjun.id,
            reviewee_id=priya.id,
            rating=5,
            reliability_score=5,
            skill_quality_score=5,
            would_exchange_again=True,
            comment="Priya's photography skills are top-notch. She took crisp, professional headshots in exchange for my web work. Highly recommended neighbor!"
        ))

        # 6. Social Feed Posts
        db.add(Post(
            author_id=ravi.id,
            post_type="OFFER",
            title="Available for plumbing & faucet repairs this weekend",
            content="Hey Madhapur neighbors! I have a few open hours this Saturday. Happy to help fix kitchen leaks or bathroom plumbing in exchange for help setting up my small business website.",
            skill_id=skill_records["Plumbing"].id,
            likes_count=6,
            created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=4)
        ))

        db.add(Post(
            author_id=ananya.id,
            post_type="REQUEST",
            title="Looking for someone with studio photography equipment",
            content="I am redesigning my design studio portfolio and need 4-5 high-res product photos. Can exchange 5 hours of Figma UI/UX design or website wireframing!",
            skill_id=skill_records["Photography"].id,
            likes_count=4,
            created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=8)
        ))

        db.add(Post(
            author_id=priya.id,
            post_type="COMPLETED_EXCHANGE",
            title="Succesful barter completed with Arjun Sharma! 🤝",
            content="Just finished our skill exchange: Arjun built me a stunning portfolio website in exchange for 2 hours of commercial photography. Zero cash spent, community trust strengthened!",
            skill_id=skill_records["Web Development"].id,
            exchange_id=past_ex.id,
            partner_id=arjun.id,
            likes_count=12,
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=15)
        ))

        # 7. Initial Notifications for Arjun
        db.add(Notification(
            user_id=arjun.id,
            type="SKILL_MATCH",
            title="High Compatibility Match Nearby!",
            message="Ravi Kumar (1.8 km away) needs Web Development and offers Plumbing. 96% Match!",
            link="/matches",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(minutes=10)
        ))

        db.commit()
        print("Database seed successfully finished!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
