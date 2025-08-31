import streamlit as st
import Service as svc
import pandas as pd
import numpy as np
from streamlit_navigation_bar import st_navbar

# app config
st.set_page_config(page_title='Shelter App', layout = 'wide', initial_sidebar_state = 'collapsed')

# variables
existing_shelters = svc.load_existing_shelters_data()

# view
st_navbar(["Home", "Dupa"])
col1, col2 = st.columns(2)

with col1:
    st.header("Parametry procesu")
    st.write("Procent pokrycia")

with col2:
    st.header("Mapa podglądowa")
    st.map(data=existing_shelters, latitude="y", longitude="x", color="#0000FF", size=50)

