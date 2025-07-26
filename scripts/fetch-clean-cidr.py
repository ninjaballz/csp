#!/usr/bin/env python3
"""
Clean CIDR Auto-Fetcher with BGPView ASN Discovery for ninjaballz
Created: 2025-07-26 08:56:42 UTC
Gets random ASNs from BGPView search API
"""

import os
import json
import requests
import random
import ipaddress
import socket
from datetime import datetime
import time

# Configuration
COUNTRY = os.environ.get('COUNTRY', 'US')
MAX_CIDRS_TO_SAVE = 3  # Save 2-3 best CIDRs

class FastBlacklistChecker:
    """Ultra-fast blacklist checker"""
    
    def check_spamhaus_zen(self, ip):
        """Check Spamhaus ZEN"""
        reversed_ip = '.'.join(reversed(ip.split('.')))
        query = f"{reversed_ip}.zen.spamhaus.org"
        
        try:
            socket.setdefaulttimeout(2)
            result = socket.gethostbyname(query)
            return False, 100  # Listed = bad
        except socket.gaierror:
            return True, 0    # Not listed = good
        except:
            return None, 50
    
    def check_stopforumspam(self, ip):
        """Quick StopForumSpam check"""
        try:
            url = f"https://api.stopforumspam.org/api?ip={ip}&json"
            response = requests.get(url, timeout=3)
            
            if response.status_code == 200:
                data = response.json()
                appears = data.get('ip', {}).get('appears', 0)
                if appears == 0:
                    return True, 0
                else:
                    confidence = min(data.get('ip', {}).get('confidence', 50), 100)
                    return False, confidence
        except:
            pass
        
        return None, 25
    
    def get_spam_score(self, ip):
        """Get quick spam score"""
        spamhaus_clean, spamhaus_score = self.check_spamhaus_zen(ip)
        
        if spamhaus_clean is False:
            return 100, True
        
        sfs_clean, sfs_score = self.check_stopforumspam(ip)
        
        scores = []
        if spamhaus_clean is not None:
            scores.append(spamhaus_score)
        if sfs_clean is not None:
            scores.append(sfs_score)
        
        if not scores:
            return 50, False
        
        avg_score = sum(scores) / len(scores)
        is_blacklisted = avg_score > 50
        
        return avg_score, is_blacklisted

def get_random_asns_from_bgpview(country_code):
    """Fetch ASNs from BGPView search API and select randomly"""
    print(f"🔍 Searching ASNs for {country_code} from BGPView...")
    
    url = f"https://api.bgpview.io/search?query_term={country_code}"
    
    try:
        response = requests.get(url, timeout=15, headers={'User-Agent': 'Mozilla/5.0'})
        
        if response.status_code == 200:
            data = response.json()
            asns = data.get('data', {}).get('asns', [])
            
            if not asns:
                print(f"⚠️  No ASNs found for {country_code}")
                return []
            
            print(f"✅ Found {len(asns)} ASNs for {country_code}")
            
            # Filter for likely residential ISPs
            residential_asns = []
            
            for asn_data in asns:
                name = asn_data.get('name', '').upper()
                description = asn_data.get('description', '').upper()
                asn = asn_data.get('asn')
                
                # Skip cloud/hosting providers
                skip_keywords = [
                    'AMAZON', 'GOOGLE', 'MICROSOFT', 'CLOUD', 'HOSTING',
                    'DIGITAL', 'LINODE', 'VULTR', 'SERVER', 'DATA CENTER',
                    'DATACENTER', 'VPS', 'DEDICATED', 'COLOCATION'
                ]
                
                # Look for residential indicators
                residential_keywords = [
                    'TELECOM', 'BROADBAND', 'CABLE', 'DSL', 'FIBER',
                    'INTERNET', 'COMMUNICATIONS', 'TELEKOM', 'TELECOM',
                    'MOBILE', 'WIRELESS', 'ISP'
                ]
                
                # Check if it's likely residential
                full_text = f"{name} {description}"
                
                if any(skip in full_text for skip in skip_keywords):
                    continue
                
                # Prefer those with residential keywords
                if any(keyword in full_text for keyword in residential_keywords):
                    residential_asns.append({
                        'asn': asn,
                        'name': asn_data.get('name', ''),
                        'description': asn_data.get('description', ''),
                        'priority': 1
                    })
                else:
                    # Still include others but with lower priority
                    residential_asns.append({
                        'asn': asn,
                        'name': asn_data.get('name', ''),
                        'description': asn_data.get('description', ''),
                        'priority': 2
                    })
            
            if not residential_asns:
                # If no residential found, use any ASNs
                residential_asns = [{'asn': a['asn'], 'name': a['name'], 'priority': 3} for a in asns[:20]]
            
            print(f"📊 Found {len(residential_asns)} potential residential ASNs")
            
            # Sort by priority (residential first)
            residential_asns.sort(key=lambda x: x['priority'])
            
            # Randomly select 2-3 ASNs
            num_to_select = random.randint(2, min(3, len(residential_asns)))
            
            # Use weighted random selection (prefer residential)
            selected_asns = []
            
            # First, try to get at least one high-priority ASN
            high_priority = [a for a in residential_asns if a['priority'] == 1]
            if high_priority:
                selected_asns.append(random.choice(high_priority))
                num_to_select -= 1
            
            # Then randomly select the rest
            remaining = [a for a in residential_asns if a not in selected_asns]
            if remaining and num_to_select > 0:
                selected_asns.extend(random.sample(remaining, min(num_to_select, len(remaining))))
            
            # Extract just the ASN numbers
            selected_asn_numbers = [a['asn'] for a in selected_asns]
            
            print(f"🎲 Randomly selected ASNs:")
            for asn_info in selected_asns:
                print(f"   AS{asn_info['asn']}: {asn_info['name']}")
            
            return selected_asn_numbers
            
    except Exception as e:
        print(f"❌ Error fetching from BGPView: {e}")
    
    return []

def fetch_prefixes_for_asn(asn):
    """Fetch prefixes for ASN from BGPView"""
    url = f"https://api.bgpview.io/asn/{asn}/prefixes"
    
    try:
        response = requests.get(url, timeout=10, headers={'User-Agent': 'Mozilla/5.0'})
        if response.status_code == 200:
            data = response.json()
            prefixes = []
            
            # Get IPv4 prefixes
            for p in data.get('data', {}).get('ipv4_prefixes', []):
                prefix = p.get('prefix')
                if prefix:
                    try:
                        network = ipaddress.IPv4Network(prefix)
                        # Prefer residential-sized blocks (/16 to /24)
                        if 16 <= network.prefixlen <= 24:
                            prefixes.append(prefix)
                    except:
                        pass
            
            # Return random selection
            if len(prefixes) > 5:
                return random.sample(prefixes, 5)
            return prefixes
    except Exception as e:
        print(f"  ❌ Error fetching AS{asn}: {e}")
    
    return []

def generate_test_ip(cidr):
    """Generate random IP from CIDR for testing"""
    try:
        network = ipaddress.IPv4Network(cidr, strict=False)
        all_hosts = list(network.hosts())
        
        if len(all_hosts) > 10:
            # Pick from middle of range
            middle = len(all_hosts) // 2
            offset = random.randint(-min(100, middle//2), min(100, middle//2))
            return str(all_hosts[middle + offset])
        elif all_hosts:
            return str(random.choice(all_hosts))
        else:
            return str(network.network_address + 1)
    except:
        return None

def test_cidr_cleanliness(cidr, checker):
    """Test if CIDR is clean"""
    test_ip = generate_test_ip(cidr)
    if not test_ip:
        return None
    
    score, is_blacklisted = checker.get_spam_score(test_ip)
    
    return {
        'cidr': cidr,
        'test_ip': test_ip,
        'score': score,
        'blacklisted': is_blacklisted,
        'clean': score < 20
    }

def main():
    """Main function"""
    print(f"🚀 Clean CIDR Auto-Fetcher for ninjaballz")
    print(f"📅 Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")
    print(f"🌍 Country: {COUNTRY}")
    print()
    
    # Get random ASNs from BGPView
    asns = get_random_asns_from_bgpview(COUNTRY)
    
    if not asns:
        print("❌ No ASNs found from BGPView")
        return
    
    # Collect CIDRs from ASNs
    all_cidrs = []
    asn_map = {}
    
    for asn in asns:
        print(f"\n📡 Fetching prefixes for AS{asn}...")
        prefixes = fetch_prefixes_for_asn(asn)
        
        if prefixes:
            print(f"  ✅ Got {len(prefixes)} prefixes")
            for prefix in prefixes:
                all_cidrs.append(prefix)
                asn_map[prefix] = asn
        else:
            print(f"  ⚠️  No prefixes found")
        
        time.sleep(1)  # Rate limiting between ASN queries
    
    if not all_cidrs:
        print("❌ No CIDRs collected")
        return
    
    # Test CIDRs for cleanliness
    print(f"\n🔍 Testing {len(all_cidrs)} CIDRs...")
    
    checker = FastBlacklistChecker()
    tested_results = []
    
    # Test each CIDR
    for i, cidr in enumerate(all_cidrs):
        print(f"  [{i+1}/{len(all_cidrs)}] Testing {cidr}...", end='', flush=True)
        
        result = test_cidr_cleanliness(cidr, checker)
        if result:
            result['asn'] = asn_map.get(cidr, 'Unknown')
            tested_results.append(result)
            
            if result['clean']:
                print(f" ✅ Clean (score: {result['score']:.1f})")
            else:
                print(f" ❌ Dirty (score: {result['score']:.1f})")
        else:
            print(" ⚠️  Failed")
        
        time.sleep(0.5)  # Rate limiting
    
    # Sort by score (lower is better)
    tested_results.sort(key=lambda x: x['score'])
    
    # Get the cleanest CIDRs
    clean_cidrs = [r for r in tested_results if r['clean']][:MAX_CIDRS_TO_SAVE]
    
    # If not enough clean ones, take best scored
    if len(clean_cidrs) < 2:
        clean_cidrs = tested_results[:MAX_CIDRS_TO_SAVE]
    
    # ninjaballz custom ranges
    custom_ranges = [
        '46.44.64.0/18',
        '121.122.0.0/17',
        '62.178.128.0/17',
        '150.91.224.0/20'
    ]
    
    # Write results
    with open('cidr-ranges.txt', 'w') as f:
        f.write(f"# Clean Residential CIDRs\n")
        f.write(f"# Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC\n")
        f.write(f"# User: ninjaballz\n")
        f.write(f"# Country: {COUNTRY}\n")
        f.write(f"# Auto-updated every 10 minutes via BGPView\n\n")
        
        # Custom ranges
        f.write("# ninjaballz custom ranges\n")
        for cidr in custom_ranges:
            f.write(f"{cidr}\n")
        
        # Clean residential ranges
        f.write(f"\n# Clean {COUNTRY} Residential Ranges (Random ASNs)\n")
        for result in clean_cidrs:
            f.write(f"# AS{result['asn']} - Score: {result['score']:.1f} - Test IP: {result['test_ip']}\n")
            f.write(f"{result['cidr']}\n")
    
    # Save report
    report = {
        'timestamp': datetime.utcnow().isoformat(),
        'country': COUNTRY,
        'asns_used': asns,
        'total_tested': len(tested_results),
        'clean_found': len([r for r in tested_results if r['clean']]),
        'saved_cidrs': [r['cidr'] for r in clean_cidrs],
        'best_scores': clean_cidrs
    }
    
    with open('clean-report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    # Summary
    print(f"\n✅ Complete!")
    print(f"📊 Summary:")
    print(f"   Country: {COUNTRY}")
    print(f"   ASNs used: {asns}")
    print(f"   CIDRs tested: {len(tested_results)}")
    print(f"   Clean CIDRs saved: {len(clean_cidrs)}")
    
    if clean_cidrs:
        print(f"\n🏆 Best CIDRs:")
        for r in clean_cidrs:
            print(f"   {r['cidr']} (AS{r['asn']}, score: {r['score']:.1f})")

if __name__ == "__main__":
    random.seed(int(time.time()))
    main()
